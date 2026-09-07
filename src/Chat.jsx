import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import ConversationInfo from './ConversationInfo'
import { colors } from './colors'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const EDIT_WINDOW_MS = 60 * 60 * 1000

export default function Chat({ session, conversationId, onBack }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [profiles, setProfiles] = useState({})
  const [avatars, setAvatars] = useState({})
  const [readReceipts, setReadReceipts] = useState({})
  const [reactions, setReactions] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [typingUsers, setTypingUsers] = useState({})
  const [messageAttachments, setMessageAttachments] = useState({})
  const [isRecording, setIsRecording] = useState(false)
  const [conversationType, setConversationType] = useState(null)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [newParticipantUsername, setNewParticipantUsername] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [contextMenuFor, setContextMenuFor] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [deleteConfirmFor, setDeleteConfirmFor] = useState(null)
  const mediaRecorderRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    fetchParticipantProfiles()
    fetchConversationType()
    fetchReactions()
    fetchMyAdminStatus()

    const messagesChannel = supabase
      .channel('messages-channel-' + conversationId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new])
          markAsRead(payload.new.id)

          const { data: att } = await supabase
            .from('message_attachments')
            .select('*')
            .eq('message_id', payload.new.id)
            .single()

          if (att) {
            setMessageAttachments((prev) => ({ ...prev, [payload.new.id]: att }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)))
        }
      )
      .subscribe()

    const readsChannel = supabase
      .channel('reads-channel-' + conversationId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => {
          setReadReceipts((prev) => ({
            ...prev,
            [payload.new.message_id]: [...(prev[payload.new.message_id] || []), payload.new.user_id]
          }))
        }
      )
      .subscribe()

    const reactionsChannel = supabase
      .channel('reactions-channel-' + conversationId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          fetchReactions()
        }
      )
      .subscribe()

    const typingChannel = supabase
      .channel('typing-' + conversationId)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== session.user.id) {
          setTypingUsers((prev) => ({ ...prev, [payload.payload.userId]: Date.now() }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(readsChannel)
      supabase.removeChannel(reactionsChannel)
      supabase.removeChannel(typingChannel)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchParticipantProfiles = async () => {
    const { data: participants, error: partError } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)

    if (partError || !participants) return

    const userIds = participants.map((p) => p.user_id)

    const { data: profilesData, error: profError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds)

    if (profError || !profilesData) return

    const profilesMap = {}
    const avatarsMap = {}
    profilesData.forEach((p) => {
      profilesMap[p.id] = p.display_name || p.username
      avatarsMap[p.id] = p.avatar_url
    })
    setProfiles(profilesMap)
    setAvatars(avatarsMap)
  }

  const fetchConversationType = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('type')
      .eq('id', conversationId)
      .single()

    if (!error && data) {
      setConversationType(data.type)
    }
  }

  const fetchMyAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('is_admin')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!error && data) {
      setIsAdmin(data.is_admin)
    }
  }

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      alert('Erreur de chargement : ' + error.message)
      return
    }

    setMessages(data)

    const messageIdsForAtt = data.map((m) => m.id)
    if (messageIdsForAtt.length > 0) {
      const { data: attachments } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', messageIdsForAtt)

      if (attachments) {
        const attachmentsMap = {}
        attachments.forEach((att) => {
          attachmentsMap[att.message_id] = att
        })
        setMessageAttachments(attachmentsMap)
      }
    }

    const messageIds = data.map((m) => m.id)
    if (messageIds.length > 0) {
      const { data: reads } = await supabase
        .from('message_reads')
        .select('message_id, user_id')
        .in('message_id', messageIds)

      if (reads) {
        const receiptsMap = {}
        reads.forEach((r) => {
          if (!receiptsMap[r.message_id]) receiptsMap[r.message_id] = []
          receiptsMap[r.message_id].push(r.user_id)
        })
        setReadReceipts(receiptsMap)
      }
    }

    data.forEach((msg) => {
      if (msg.sender_id !== session.user.id) {
        markAsRead(msg.id)
      }
    })
  }

  const fetchReactions = async () => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)

    if (!msgs) return
    const messageIds = msgs.map((m) => m.id)
    if (messageIds.length === 0) return

    const { data, error } = await supabase
      .from('message_reactions')
      .select('message_id, user_id, emoji')
      .in('message_id', messageIds)

    if (error || !data) return

    const reactionsMap = {}
    data.forEach((r) => {
      if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
      reactionsMap[r.message_id].push({ userId: r.user_id, emoji: r.emoji })
    })
    setReactions(reactionsMap)
  }

  const markAsRead = async (messageId) => {
    await supabase.from('message_reads').upsert(
      { message_id: messageId, user_id: session.user.id },
      { onConflict: 'message_id,user_id' }
    )
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      content: newMessage,
      reply_to_id: replyingTo ? replyingTo.id : null
    })

    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      setNewMessage('')
      setReplyingTo(null)
    }
  }

  const handleTyping = (value) => {
    setNewMessage(value)
    supabase.channel('typing-' + conversationId).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: session.user.id }
    })
  }

  const getTypingUsersText = () => {
    const now = Date.now()
    const activeTypers = Object.entries(typingUsers).filter(([_, timestamp]) => now - timestamp < 3000)
    if (activeTypers.length === 0) return null
    const names = activeTypers.map(([userId]) => profiles[userId] || '...')
    return names.join(', ') + (names.length > 1 ? ' sont en train d\'écrire' : ' est en train d\'écrire')
  }

  const canDeleteForEveryone = (msg) => {
    const isMine = msg.sender_id === session.user.id
    if (isAdmin) return true
    if (!isMine) return false
    const age = Date.now() - new Date(msg.created_at).getTime()
    return age < EDIT_WINDOW_MS
  }

  const deleteForMe = async (messageId) => {
    const { data: { user } } = await supabase.auth.getUser()
    const msg = messages.find((m) => m.id === messageId)
    const currentDeletedFor = msg?.deleted_for || []

    const { error } = await supabase
      .from('messages')
      .update({ deleted_for: [...currentDeletedFor, user.id] })
      .eq('id', messageId)

    if (error) {
      alert('Erreur suppression : ' + error.message)
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted_for: [...currentDeletedFor, user.id] } : m))
      )
    }
    setDeleteConfirmFor(null)
  }

  const deleteForEveryone = async (messageId) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, deleted_for_everyone: true })
      .eq('id', messageId)

    if (error) {
      alert('Erreur suppression : ' + error.message)
    }
    setDeleteConfirmFor(null)
  }

  const addParticipant = async () => {
    if (!newParticipantUsername.trim()) return

    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', newParticipantUsername.trim())
      .single()

    if (userError || !targetUser) {
      alert('Utilisateur introuvable')
      return
    }

    const { error: partError } = await supabase.from('conversation_participants').insert({
      conversation_id: conversationId,
      user_id: targetUser.id
    })

    if (partError) {
      alert('Erreur : ' + partError.message)
    } else {
      alert(targetUser.username + ' a été ajouté au groupe')
      setNewParticipantUsername('')
      setShowAddParticipant(false)
      fetchParticipantProfiles()
    }
  }

  const toggleReaction = async (messageId, emoji) => {
    const existing = (reactions[messageId] || []).find(
      (r) => r.userId === session.user.id && r.emoji === emoji
    )

    if (existing) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', session.user.id)
        .eq('emoji', emoji)
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: session.user.id,
        emoji
      })
    }

    setContextMenuFor(null)
    setShowEmojiPicker(false)
  }

  const isReadByOthers = (messageId) => {
    const readers = readReceipts[messageId] || []
    return readers.some((userId) => userId !== session.user.id)
  }

  const getGroupedReactions = (messageId) => {
    const msgReactions = reactions[messageId] || []
    const grouped = {}
    msgReactions.forEach((r) => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1
    })
    return grouped
  }

  const getMessageById = (id) => messages.find((m) => m.id === id)

  const uploadFile = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
    const filePath = `${conversationId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file)

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath)

    let fileType = 'file'
    if (file.type.startsWith('image/')) fileType = 'image'
    else if (file.type.startsWith('video/')) fileType = 'video'
    else if (file.type.startsWith('audio/')) fileType = 'audio'
    else if (file.type === 'application/pdf') fileType = 'pdf'

    return {
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_name: file.name,
      file_size: file.size
    }
  }

  const sendFileMessage = async (file) => {
    const attachment = await uploadFile(file)
    if (!attachment) return

    const { data: newMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: '',
        reply_to_id: replyingTo ? replyingTo.id : null
      })
      .select()
      .single()

    if (msgError) {
      alert('Erreur message : ' + msgError.message)
      return
    }

    const { error: attError } = await supabase.from('message_attachments').insert({
      message_id: newMsg.id,
      file_url: attachment.file_url,
      file_type: attachment.file_type,
      file_name: attachment.file_name,
      file_size: attachment.file_size
    })

    if (attError) {
      alert('Erreur pièce jointe : ' + attError.message)
    }

    setReplyingTo(null)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      sendFileMessage(file)
    }
    e.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const chunks = []

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        await sendFileMessage(audioFile)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (err) {
      alert('Erreur microphone : ' + err.message)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const renderAttachment = (attachment) => {
    if (!attachment) return null

    if (attachment.file_type === 'image') {
      return (
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          style={{ maxWidth: '100%', width: 230, borderRadius: 14, display: 'block' }}
        />
      )
    }

    if (attachment.file_type === 'video') {
      return (
        <video
          src={attachment.file_url}
          controls
          style={{ maxWidth: '100%', width: 230, borderRadius: 14, display: 'block' }}
        />
      )
    }

    if (attachment.file_type === 'audio') {
      return (
        <audio src={attachment.file_url} controls style={{ display: 'block', maxWidth: '100%', width: 230 }} />
      )
    }

    return (
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 15px',
          background: colors.blueLight,
          borderRadius: 12,
          textDecoration: 'none',
          color: colors.blueDark,
          fontSize: 14,
          fontWeight: 500
        }}
      >
        📄 {attachment.file_name}
      </a>
    )
  }

  const handlePressStart = (msg) => {
    const timer = setTimeout(() => {
      setContextMenuFor(msg)
    }, 500)
    return timer
  }

  const renderMessage = (msg) => {
    if ((msg.deleted_for || []).includes(session.user.id)) {
      return null
    }

    const isMine = msg.sender_id === session.user.id
    const senderName = profiles[msg.sender_id] || '...'
    const senderAvatar = avatars[msg.sender_id]
    const read = isReadByOthers(msg.id)
    const groupedReactions = getGroupedReactions(msg.id)
    const repliedMsg = msg.reply_to_id ? getMessageById(msg.reply_to_id) : null
    const attachment = messageAttachments[msg.id]
    let pressTimer = null

    if (msg.is_deleted) {
      return (
        <div key={msg.id} className="message-enter" style={{ textAlign: isMine ? 'right' : 'left', marginBottom: 16 }}>
          {!isMine && (
            <div style={{ fontSize: 12, color: colors.textLight, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              {senderAvatar && (
                <img src={senderAvatar} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
              )}
              {senderName}
            </div>
          )}
          <span
            style={{
              display: 'inline-block',
              background: colors.border,
              padding: '9px 15px',
              borderRadius: 16,
              fontStyle: 'italic',
              color: colors.textLight,
              fontSize: 14
            }}
          >
            🚫 Message supprimé
          </span>
        </div>
      )
    }

    return (
      <div key={msg.id} className="message-enter" style={{ textAlign: isMine ? 'right' : 'left', marginBottom: 16 }}>
        {!isMine && (
          <div style={{ fontSize: 12, color: colors.textLight, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            {senderAvatar && (
              <img src={senderAvatar} alt="avatar" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
            )}
            {senderName}
          </div>
        )}

        {repliedMsg && (
          <div
            style={{
              fontSize: 12.5,
              color: colors.textLight,
              background: colors.blueLight,
              borderLeft: `3px solid ${colors.blue}`,
              padding: '6px 11px',
              borderRadius: 10,
              marginBottom: 4,
              display: 'inline-block',
              maxWidth: '80%'
            }}
          >
            <b style={{ color: colors.blueDark }}>{profiles[repliedMsg.sender_id] || '...'}</b>: {repliedMsg.is_deleted ? 'Message supprimé' : repliedMsg.content}
          </div>
        )}
        <br />

        {attachment && (
          <div style={{ marginBottom: 5 }}>
            {renderAttachment(attachment)}
          </div>
        )}

        {msg.content && (
          <span
            onMouseDown={() => { pressTimer = handlePressStart(msg) }}
            onMouseUp={() => clearTimeout(pressTimer)}
            onMouseLeave={() => clearTimeout(pressTimer)}
            onTouchStart={() => { pressTimer = handlePressStart(msg) }}
            onTouchEnd={() => clearTimeout(pressTimer)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenuFor(msg) }}
            style={{
              display: 'inline-block',
              background: isMine ? colors.yellowLight : colors.white,
              padding: '10px 16px',
              borderRadius: 18,
              cursor: 'pointer',
              fontSize: 15.5,
              lineHeight: 1.45,
              color: colors.text,
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              userSelect: 'none',
              wordBreak: 'break-word',
              maxWidth: '85%'
            }}
          >
            {msg.content}
          </span>
        )}

        {Object.keys(groupedReactions).length > 0 && (
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {Object.entries(groupedReactions).map(([emoji, count]) => (
              <span
                key={emoji}
                className="reaction-pop"
                style={{
                  marginRight: 4,
                  background: colors.white,
                  padding: '3px 8px',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'inline-block',
                  fontSize: 13
                }}
              >
                {emoji} {count > 1 ? count : ''}
              </span>
            ))}
          </div>
        )}

        {isMine && (
          <div style={{ fontSize: 11, color: read ? colors.blue : colors.textLight, marginTop: 3, fontWeight: 500 }}>
            {read ? '✓✓ Lu' : '✓ Envoyé'}
          </div>
        )}
      </div>
    )
  }

  if (showInfo) {
    return (
      <ConversationInfo
        session={session}
        conversationId={conversationId}
        conversationType={conversationType}
        onBack={() => setShowInfo(false)}
        onLeft={() => {
          setShowInfo(false)
          onBack()
        }}
      />
    )
  }

  return (
    <div className="page-slide" style={{ minHeight: '100vh', background: colors.background, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: colors.blue,
          padding: '15px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: colors.white,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(59,130,246,0.25)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ border: 'none', background: 'none', color: colors.white, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
            ←
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.2 }}>Conversation</h2>
        </div>
        <button onClick={() => setShowInfo(true)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>
          ℹ️
        </button>
      </div>

      {conversationType === 'group' && isAdmin && (
        <div style={{ padding: '11px 18px', background: colors.blueLight }}>
          {showAddParticipant ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Nom d'utilisateur..."
                value={newParticipantUsername}
                onChange={(e) => setNewParticipantUsername(e.target.value)}
                style={{ flex: '1 1 150px', padding: 9, borderRadius: 10, border: `1.5px solid ${colors.border}`, fontSize: 14 }}
              />
              <button onClick={addParticipant} style={{ background: colors.blue, color: colors.white, border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer', fontWeight: 600 }}>
                Ajouter
              </button>
              <button onClick={() => setShowAddParticipant(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddParticipant(true)}
              style={{ background: 'none', border: 'none', color: colors.blueDark, cursor: 'pointer', fontWeight: 700, fontSize: 13.5 }}
            >
              ➕ Ajouter un participant
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.map((msg) => renderMessage(msg))}
        <div ref={bottomRef} />
      </div>

      {getTypingUsersText() && (
        <div style={{ fontSize: 12.5, color: colors.textLight, fontStyle: 'italic', padding: '0 18px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          {getTypingUsersText()}
          <span className="typing-dot" style={{ fontSize: 16 }}>•</span>
        </div>
      )}

      {replyingTo && (
        <div
          className="message-enter"
          style={{
            background: colors.blueLight,
            borderLeft: `3px solid ${colors.blue}`,
            padding: '9px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13.5
          }}
        >
          <span style={{ color: colors.blueDark }}>
            Réponse à <b>{profiles[replyingTo.sender_id] || '...'}</b>: {replyingTo.content}
          </span>
          <button onClick={() => setReplyingTo(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 17 }}>
            ✕
          </button>
        </div>
      )}

      <input
        type="file"
        id="fileInput"
        accept="image/*,video/*,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 13,
          background: colors.white,
          borderTop: `1px solid ${colors.border}`,
          position: 'sticky',
          bottom: 0,
          maxWidth: 800,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={() => document.getElementById('fileInput').click()}
          style={{ border: 'none', background: 'none', fontSize: 21, cursor: 'pointer' }}
        >
          📎
        </button>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          style={{ border: 'none', background: 'none', fontSize: 21, cursor: 'pointer', color: isRecording ? colors.danger : 'inherit' }}
        >
          {isRecording ? '⏹️' : '🎤'}
        </button>

        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Écris un message..."
          style={{ flex: 1, padding: 11, borderRadius: 22, border: `1.5px solid ${colors.border}`, outline: 'none', fontSize: 15 }}
        />

        <button
          type="submit"
          style={{
            background: colors.blue,
            color: colors.white,
            border: 'none',
            borderRadius: '50%',
            width: 42,
            height: 42,
            cursor: 'pointer',
            fontSize: 17,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(59,130,246,0.35)'
          }}
        >
          ➤
        </button>
      </form>

      {contextMenuFor && !showEmojiPicker && !deleteConfirmFor && (
        <div
          className="modal-overlay-enter"
          onClick={() => setContextMenuFor(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: colors.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
        >
          <div
            className="modal-content-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.white, borderRadius: 16, padding: 8, width: 260, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <button onClick={() => { setReplyingTo(contextMenuFor); setContextMenuFor(null) }} style={menuButtonStyle}>
              ↩️ Répondre
            </button>

            <button onClick={() => setShowEmojiPicker(true)} style={menuButtonStyle}>
              😀 Réagir
            </button>

            <button onClick={() => setDeleteConfirmFor(contextMenuFor)} style={{ ...menuButtonStyle, color: colors.danger }}>
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}

      {showEmojiPicker && contextMenuFor && (
        <div
          className="modal-overlay-enter"
          onClick={() => { setShowEmojiPicker(false); setContextMenuFor(null) }}
          style={{ position: 'fixed', inset: 0, background: colors.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div
            className="modal-content-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.white, borderRadius: 16, padding: 18, display: 'flex', gap: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            {EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => toggleReaction(contextMenuFor.id, emoji)} style={{ fontSize: 28, border: 'none', background: 'none', cursor: 'pointer' }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {deleteConfirmFor && (
        <div
          className="modal-overlay-enter"
          onClick={() => { setDeleteConfirmFor(null); setContextMenuFor(null) }}
          style={{ position: 'fixed', inset: 0, background: colors.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div
            className="modal-content-enter"
            onClick={(e) => e.stopPropagation()}
            style={{ background: colors.white, borderRadius: 16, padding: 22, width: 290, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <p style={{ margin: '0 0 18px', color: colors.text, fontWeight: 700, fontSize: 15.5 }}>
              Supprimer ce message ?
            </p>

            <button onClick={() => deleteForMe(deleteConfirmFor.id)} style={{ ...menuButtonStyle, textAlign: 'left' }}>
              Supprimer pour moi
            </button>

            {canDeleteForEveryone(deleteConfirmFor) && (
              <button onClick={() => deleteForEveryone(deleteConfirmFor.id)} style={{ ...menuButtonStyle, textAlign: 'left', color: colors.danger }}>
                Supprimer pour tout le monde
              </button>
            )}

            <button onClick={() => { setDeleteConfirmFor(null); setContextMenuFor(null) }} style={{ ...menuButtonStyle, textAlign: 'left', color: colors.textLight }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const menuButtonStyle = {
  display: 'block',
  width: '100%',
  padding: '13px 16px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 15,
  borderRadius: 10,
  color: '#1F2937',
  fontWeight: 500
}
