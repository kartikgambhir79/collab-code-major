import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Play, Share2, MessageSquare, Save, X, Send, Users, FileCode, Folder, FolderOpen, Plus, Download, Pencil, Trash2, ChevronRight, ChevronDown, History, CheckCircle2, Clock } from 'lucide-react';
import EditorComponent from '@monaco-editor/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Assign a distinct color per collaborator username
const COLLAB_COLORS = ['#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
const getUserColor = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
};

export default function Editor({ user }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = searchParams.get('new') === 'true';

  // ── Core project state ──────────────────────────────────────────────────────
  const [language, setLanguage] = useState('javascript');
  const [visibility, setVisibility] = useState('public');
  const [title, setTitle] = useState('Untitled Project');
  const [canEdit, setCanEdit] = useState(false);
  const [files, setFiles] = useState([{ name: 'main.js', language: 'javascript', content: '// Write your code here...' }]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [output, setOutput] = useState('');

  // ── File explorer state ──────────────────────────────────────────────────────
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('file');
  const [newItemParentFolder, setNewItemParentFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [hoveredFileIdx, setHoveredFileIdx] = useState(null);
  const [hoveredFolder, setHoveredFolder] = useState(null);

  // ── Chat state ───────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // ── Invite state ─────────────────────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // ── Presence (real-time collab) ───────────────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState([]);
  const prevOnlineRef = useRef([]);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const cursorLineRef = useRef(1);
  const cursorColRef = useRef(1);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  // Real-time code sync refs
  const lastPushedContentRef = useRef('');  // last JSON we sent to server
  const isSyncingFromRemoteRef = useRef(false); // guard against re-entrant apply
  const isInitializedRef = useRef(false); // true after first presence + chat poll fires

  // ── Version history ───────────────────────────────────────────────────────────
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versions, setVersions] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Scroll chat to bottom
  // ─────────────────────────────────────────────────────────────────────────────
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (chatOpen) { scrollToBottom(); setUnreadCount(0); } }, [messages, chatOpen]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Typeahead for invite
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inviteUsername.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/collaborate.php?action=search_users&q=${inviteUsername}`);
        if (Array.isArray(res.data)) {
          const exact = res.data.length === 1 && res.data[0].username === inviteUsername;
          setSuggestions(exact ? [] : res.data);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [inviteUsername]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Load project on mount
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    axios.get(`http://localhost:8000/api/project.php?action=get&id=${id}&username=${user.username}`)
      .then(res => {
        if (!res.data) return;
        setCanEdit(res.data.can_edit === true || res.data.can_edit === 1);
        if (res.data.language) setLanguage(res.data.language);
        if (res.data.visibility) setVisibility(res.data.visibility);
        if (res.data.title) setTitle(res.data.title);
        if (res.data.content) {
          try {
            const parsed = JSON.parse(res.data.content);
            if (Array.isArray(parsed) && parsed.length > 0) setFiles(parsed);
            else throw new Error();
          } catch {
            const ext = res.data.language === 'python' ? 'py' : 'js';
            setFiles([{ name: `main.${ext}`, language: res.data.language || 'javascript', content: res.data.content }]);
          }
        } else {
          const ext = res.data.language === 'python' ? 'py' : 'js';
          setFiles([{ name: `main.${ext}`, language: res.data.language || 'javascript', content: '// Start coding here' }]);
        }
      }).catch(console.error);
  }, [id]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Poll: chat history + presence (every 3s). Send user leave on unmount.
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const pollInterval = setInterval(async () => {
      // Chat
      try {
        const res = await axios.get(`http://localhost:8000/api/chat.php?action=history&project_id=${id}`);
        if (Array.isArray(res.data)) {
          setMessages(prev => {
            const newMsgs = res.data;
            const newCount = newMsgs.length;
            // Only fire toast for messages that arrived AFTER we joined (not on initial load)
            if (isInitializedRef.current && newCount > prevMessageCountRef.current) {
              const latest = newMsgs[newCount - 1];
              if (latest.sender !== user.username && !chatOpen) {
                setUnreadCount(c => c + (newCount - prevMessageCountRef.current));
                toast.info(`💬 ${latest.sender}: ${latest.text}`, {
                  position: 'bottom-right', autoClose: 3000, pauseOnHover: false,
                  style: { fontSize: '0.85rem' }
                });
              }
            }
            prevMessageCountRef.current = newCount;
            return newMsgs;
          });
        }
      } catch {}

      // Presence
      try {
        const res = await axios.get(`http://localhost:8000/api/presence.php?action=list&project_id=${id}`);
        if (Array.isArray(res.data)) {
          const fresh = res.data.filter(u => u.username !== user.username);
          // Only fire join/leave toasts AFTER the first poll (skip on page-load)
          if (isInitializedRef.current) {
            const prev = prevOnlineRef.current;
            fresh.forEach(u => {
              if (!prev.find(p => p.username === u.username))
                toast.success(`🟢 ${u.username} joined`, { position: 'top-center', autoClose: 2500, hideProgressBar: true, toastId: `join-${u.username}-${Date.now()}` });
            });
            prev.forEach(u => {
              if (!fresh.find(f => f.username === u.username))
                toast.warning(`🔴 ${u.username} left`, { position: 'top-center', autoClose: 2500, hideProgressBar: true, toastId: `leave-${u.username}-${Date.now()}` });
            });
          }
          prevOnlineRef.current = fresh;
          isInitializedRef.current = true;
          setOnlineUsers(fresh);
          updateCursorDecorations(fresh);
        }
      } catch {}

    }, 3000);

    // Ping own presence every 3 seconds
    const pingInterval = setInterval(() => pingPresence(), 3000);
    // Initial ping
    pingPresence();

    // On leave, clean up presence
    const handleLeave = () => {
      navigator.sendBeacon
        ? navigator.sendBeacon('http://localhost:8000/api/presence.php?action=leave',
            JSON.stringify({ project_id: id, username: user.username }))
        : axios.post('http://localhost:8000/api/presence.php?action=leave', { project_id: id, username: user.username });
    };
    window.addEventListener('beforeunload', handleLeave);

    // ── Real-time CODE SYNC pull (every 2 seconds) ────────────────────────────
    const syncPullInterval = setInterval(async () => {
      if (isSyncingFromRemoteRef.current) return;
      try {
        const res = await axios.get(`http://localhost:8000/api/project.php?action=sync_pull&id=${id}`);
        const { content: remoteContent, last_editor } = res.data || {};
        // Only apply if the change came from someone else and differs from what we last pushed
        if (last_editor && last_editor !== user.username && remoteContent && remoteContent !== lastPushedContentRef.current) {
          isSyncingFromRemoteRef.current = true;
          try {
            const parsed = JSON.parse(remoteContent);
            if (Array.isArray(parsed) && parsed.length > 0) {
              lastPushedContentRef.current = remoteContent; // mark as applied so push doesn't re-send
              setFiles(parsed);
              // Apply to the active Monaco model, preserving cursor position
              setActiveFileIndex(prev => {
                const activeFile = parsed[prev] || parsed[0];
                if (editorRef.current && activeFile) {
                  const model = editorRef.current.getModel();
                  if (model && model.getValue() !== activeFile.content) {
                    const pos = editorRef.current.getPosition();
                    const fullRange = model.getFullModelRange();
                    model.pushEditOperations([], [{ range: fullRange, text: activeFile.content }], () => []);
                    if (pos) editorRef.current.setPosition(pos);
                  }
                }
                return prev;
              });
            }
          } finally {
            isSyncingFromRemoteRef.current = false;
          }
        }
      } catch {}
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(pingInterval);
      clearInterval(syncPullInterval);
      window.removeEventListener('beforeunload', handleLeave);
      handleLeave();
    };
  }, [id, chatOpen]);

  // ── Real-time CODE SYNC push (every 2s when content changes) ─────────────
  // Runs as a separate effect so we always capture the latest `files` value.
  useEffect(() => {
    if (!canEdit || !id) return;
    const pushInterval = setInterval(async () => {
      if (isSyncingFromRemoteRef.current) return; // skip while applying remote change
      const currentContent = JSON.stringify(files);
      if (currentContent === lastPushedContentRef.current) return; // no local change
      try {
        await axios.post('http://localhost:8000/api/project.php?action=sync_push', {
          id, content: currentContent, editor: user.username
        });
        lastPushedContentRef.current = currentContent;
      } catch {}
    }, 2000);
    return () => clearInterval(pushInterval);
  }, [canEdit, id, files]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Ping own presence
  // ─────────────────────────────────────────────────────────────────────────────
  const pingPresence = () => {
    axios.post('http://localhost:8000/api/presence.php?action=ping', {
      project_id: id,
      username: user.username,
      cursor_line: cursorLineRef.current,
      cursor_column: cursorColRef.current,
      is_typing: isTypingRef.current ? 1 : 0,
    }).catch(() => {});
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Monaco cursor decorations for collaborators
  // ─────────────────────────────────────────────────────────────────────────────
  const updateCursorDecorations = (users) => {
    if (!editorRef.current) return;
    const monaco = window.monaco;
    if (!monaco) return;
    const newDecorations = users.map(u => ({
      range: new monaco.Range(u.cursor_line, u.cursor_column, u.cursor_line, u.cursor_column + 1),
      options: {
        className: `collab-cursor-${u.username}`,
        beforeContentClassName: `collab-cursor-${u.username}-before`,
        hoverMessage: { value: `**${u.username}**${u.is_typing ? ' is typing...' : ''}` },
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      }
    }));
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);

    // Inject CSS for each user's cursor color dynamically
    users.forEach(u => {
      const color = getUserColor(u.username);
      const styleId = `collab-style-${u.username}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .collab-cursor-${u.username} { border-left: 2px solid ${color} !important; }
          .collab-cursor-${u.username}-before::before {
            content: '${u.username}';
            background: ${color};
            color: #fff;
            font-size: 10px;
            padding: 0 4px;
            border-radius: 2px;
            position: absolute;
            top: -18px;
            white-space: nowrap;
            z-index: 100;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-save every 60 seconds
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canEdit || !id) return;
    const autoSave = setInterval(() => {
      handleSave(true); // auto-save = true → saves version too
    }, 60000);
    return () => clearInterval(autoSave);
  }, [canEdit, id, files, title, language, visibility]);

  // Mark unsaved ONLY when the local user (canEdit) makes a change,
  // NOT when we apply a remote sync from another user.
  useEffect(() => {
    if (canEdit && !isSyncingFromRemoteRef.current) {
      setSaveStatus('unsaved');
    }
  }, [files]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Save project (+ optional version snapshot)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSave = async (isAutoSave = false) => {
    if (!canEdit) return;
    setSaveStatus('saving');
    const content = JSON.stringify(files);
    try {
      await axios.post('http://localhost:8000/api/project.php?action=update', { id, title, language, visibility, content });
      // Save a version snapshot
      await axios.post('http://localhost:8000/api/version.php?action=save', {
        project_id: id,
        saved_by: user.username,
        content,
        label: isAutoSave ? 'Auto-save' : `Manual save by ${user.username}`,
      });
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      if (!isAutoSave) toast.success('✅ Project saved!', { position: 'bottom-right', autoClose: 2000, hideProgressBar: true });
    } catch (err) {
      setSaveStatus('unsaved');
      console.error('Failed to save', err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Version history
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchVersions = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/version.php?action=list&project_id=${id}`);
      setVersions(res.data || []);
      setShowVersionModal(true);
    } catch {
      toast.error('Could not load version history', { position: 'bottom-right', autoClose: 2500 });
    }
  };

  const handleRestoreVersion = async (versionId, label) => {
    if (!confirm(`Restore version "${label}"? This will overwrite your current code.`)) return;
    const res = await axios.get(`http://localhost:8000/api/version.php?action=get&id=${versionId}`);
    if (res.data && res.data.content) {
      try {
        const parsed = JSON.parse(res.data.content);
        if (Array.isArray(parsed)) setFiles(parsed);
        else throw new Error();
      } catch {
        setFiles([{ name: 'main.js', language: 'javascript', content: res.data.content }]);
      }
      setShowVersionModal(false);
      toast.info('⏪ Version restored!', { position: 'bottom-right', autoClose: 2500 });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Run code
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRunCode = async () => {
    setOutput('Running code...');
    try {
      const response = await axios.post('http://localhost:8000/api/run_code.php', {
        code: files[activeFileIndex]?.content || '',
        language: files[activeFileIndex]?.language || 'javascript'
      });
      setOutput('> ' + (response.data.output || 'Code executed successfully.'));
    } catch (err) {
      setOutput('> Error running code.\n> ' + err.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;
    const msgText = currentMessage;
    const tempMsg = {
      id: Date.now(), sender: user.username, text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => { prevMessageCountRef.current = prev.length + 1; return [...prev, tempMsg]; });
    setCurrentMessage('');
    try {
      await axios.post('http://localhost:8000/api/chat.php?action=send', { project_id: id, sender: user.username, message: msgText });
    } catch (err) { console.error(err); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Invite
  // ─────────────────────────────────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    try {
      const res = await axios.post('http://localhost:8000/api/collaborate.php?action=invite', { project_id: id, username: inviteUsername });
      if (res.data.success) { toast.success('Invitation sent!', { position: 'bottom-right', autoClose: 2000 }); setShowInviteModal(false); setInviteUsername(''); }
      else toast.error(res.data.message || 'Failed', { position: 'bottom-right', autoClose: 3000 });
    } catch { toast.error('An error occurred', { position: 'bottom-right' }); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // File explorer helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    if (newItemType === 'folder') {
      const folderPath = newItemParentFolder ? `${newItemParentFolder}/${newItemName}` : newItemName;
      if (!folders.find(f => f.name === folderPath)) {
        setFolders([...folders, { name: folderPath }]);
        setExpandedFolders(prev => ({ ...prev, [folderPath]: true }));
      }
    } else {
      const ext = newItemName.split('.').pop()?.toLowerCase();
      const langMap = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', php: 'php', html: 'html', css: 'css', json: 'json' };
      const lang = langMap[ext] || 'javascript';
      const fullName = newItemParentFolder ? `${newItemParentFolder}/${newItemName}` : newItemName;
      const newFiles = [...files, { name: fullName, language: lang, content: '' }];
      setFiles(newFiles);
      setActiveFileIndex(newFiles.length - 1);
    }
    setNewItemName(''); setShowNewItemModal(false); setNewItemParentFolder(null);
  };

  const handleRenameFile = (idx) => {
    if (!renameValue.trim()) { setRenamingIdx(null); return; }
    const ext = renameValue.split('.').pop()?.toLowerCase();
    const langMap = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', php: 'php', html: 'html', css: 'css', json: 'json' };
    const lang = langMap[ext] || files[idx].language;
    const newFiles = [...files];
    newFiles[idx] = { ...newFiles[idx], name: renameValue, language: lang };
    setFiles(newFiles); setRenamingIdx(null); setRenameValue('');
  };

  const handleDeleteFile = (idx) => {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setActiveFileIndex(Math.min(activeFileIndex, Math.max(0, newFiles.length - 1)));
  };

  const handleCloseTab = (e, idx) => { e.stopPropagation(); handleDeleteFile(idx); };

  const handleDownloadProject = () => {
    const zip = new JSZip();
    files.forEach(file => zip.file(file.name, file.content));
    zip.generateAsync({ type: 'blob' }).then(content => saveAs(content, `${title.replace(/\s+/g, '_')}_project.zip`));
  };

  const getFileTree = () => {
    const tree = [];
    folders.forEach(f => { if (f.name.split('/').length === 1) tree.push({ type: 'folder', name: f.name, path: f.name }); });
    files.forEach((file, idx) => { if (!file.name.includes('/')) tree.push({ type: 'file', name: file.name, idx }); });
    return tree;
  };

  const getFolderChildren = (folderPath) => {
    const subtrees = [];
    folders.forEach(f => {
      const parts = f.name.split('/');
      if (parts.length > 1 && f.name.startsWith(folderPath + '/') && f.name.split('/').length === folderPath.split('/').length + 1)
        subtrees.push({ type: 'folder', name: parts[parts.length - 1], path: f.name });
    });
    files.forEach((file, idx) => {
      const prefix = folderPath + '/';
      if (file.name.startsWith(prefix) && !file.name.slice(prefix.length).includes('/'))
        subtrees.push({ type: 'file', name: file.name.slice(prefix.length), idx });
    });
    return subtrees;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Save Status indicator label
  // ─────────────────────────────────────────────────────────────────────────────
  const SaveIndicator = () => {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-xs text-yellow-400"><Clock className="w-3 h-3 animate-spin"/>Saving...</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3 h-3"/>Saved {lastSavedAt ? lastSavedAt.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</span>;
    return <span className="text-xs text-slate-500">Unsaved changes</span>;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // File sidebar node (extracted for reuse)
  // ─────────────────────────────────────────────────────────────────────────────
  const FileNode = ({ node, indent = 0 }) => (
    <div
      style={{ paddingLeft: `${12 + indent * 12}px` }}
      onClick={() => setActiveFileIndex(node.idx)}
      onMouseEnter={() => setHoveredFileIdx(node.idx)}
      onMouseLeave={() => setHoveredFileIdx(null)}
      className={`pr-2 py-1.5 text-sm cursor-pointer flex items-center gap-2 transition-colors ${activeFileIndex === node.idx ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'}`}
    >
      <FileCode className="w-3.5 h-3.5 shrink-0" />
      {renamingIdx === node.idx ? (
        <input autoFocus className="bg-slate-700 text-white text-xs rounded px-1 w-full outline-none"
          value={renameValue} onChange={e => setRenameValue(e.target.value)}
          onBlur={() => handleRenameFile(node.idx)}
          onKeyDown={e => { if (e.key === 'Enter') handleRenameFile(node.idx); if (e.key === 'Escape') setRenamingIdx(null); }}
          onClick={e => e.stopPropagation()} />
      ) : (
        <span className="truncate flex-1">{node.name}</span>
      )}
      {canEdit && hoveredFileIdx === node.idx && renamingIdx !== node.idx && (
        <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRenamingIdx(node.idx); setRenameValue(files[node.idx].name.split('/').pop()); }} className="hover:text-white transition-colors"><Pencil className="w-3 h-3"/></button>
          <button onClick={() => handleDeleteFile(node.idx)} className="hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3"/></button>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Toast Container */}
      <ToastContainer newestOnTop />

      {/* ── Top Toolbar ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">{title}</h2>
          {canEdit && <SaveIndicator />}
        </div>

        <div className="flex items-center gap-2">
          {/* Online users bar */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-3 mr-1">
            {/* Self */}
            <div title={user.username} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-900 shrink-0" style={{ background: getUserColor(user.username) }}>
              {user.username[0].toUpperCase()}
            </div>
            {/* Others */}
            {onlineUsers.map(u => (
              <div key={u.username} title={`${u.username}${u.is_typing ? ' (typing…)' : ''}`}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-slate-900 shrink-0 relative"
                style={{ background: getUserColor(u.username) }}>
                {u.username[0].toUpperCase()}
                {u.is_typing && <span className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full text-[9px] px-0.5">✍</span>}
              </div>
            ))}
            <span className="text-xs text-slate-500 ml-1">{onlineUsers.length + 1} online</span>
          </div>

          {canEdit && (
            <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" /><span className="hidden sm:inline">Invite</span>
            </button>
          )}
          {canEdit && (
            <button onClick={() => handleSave(false)} className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
              <Save className="w-4 h-4" /><span className="hidden sm:inline">Save</span>
            </button>
          )}
          {/* History visible to everyone — editors + viewers */}
          <button onClick={fetchVersions} className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
            <History className="w-4 h-4" /><span className="hidden sm:inline">History</span>
          </button>
          <button onClick={handleDownloadProject} className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={handleRunCode} className="flex items-center gap-1 text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 px-4 py-1.5 rounded-lg text-white font-medium shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
            <Play className="w-4 h-4" /><span>Run</span>
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar */}
        <div className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0 z-10 select-none">
          <div className="p-3 border-b border-slate-700 flex justify-between items-center text-slate-300">
            <span className="text-xs uppercase font-bold tracking-wider flex items-center gap-2"><Folder className="w-4 h-4 text-blue-400"/>Explorer</span>
            {canEdit && (
              <div className="flex gap-1">
                <button onClick={() => { setNewItemType('file'); setNewItemParentFolder(null); setShowNewItemModal(true); }} className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors" title="New File"><Plus className="w-3.5 h-3.5"/></button>
                <button onClick={() => { setNewItemType('folder'); setNewItemParentFolder(null); setShowNewItemModal(true); }} className="hover:text-white p-1 rounded hover:bg-slate-800 transition-colors" title="New Folder"><FolderOpen className="w-3.5 h-3.5"/></button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {getFileTree().map((node) =>
              node.type === 'folder' ? (
                <div key={node.path}>
                  <div className="flex items-center gap-1 px-2 py-1.5 text-sm cursor-pointer text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    onMouseEnter={() => setHoveredFolder(node.path)} onMouseLeave={() => setHoveredFolder(null)}
                    onClick={() => setExpandedFolders(prev => ({ ...prev, [node.path]: !prev[node.path] }))}>
                    {expandedFolders[node.path] ? <ChevronDown className="w-3 h-3 shrink-0 text-slate-500"/> : <ChevronRight className="w-3 h-3 shrink-0 text-slate-500"/>}
                    <Folder className="w-4 h-4 shrink-0 text-yellow-400"/>
                    <span className="truncate flex-1">{node.name}</span>
                    {canEdit && hoveredFolder === node.path && (
                      <div className="flex gap-1 ml-auto" onClick={e => e.stopPropagation()}>
                        <button title="New file in folder" onClick={() => { setNewItemType('file'); setNewItemParentFolder(node.path); setShowNewItemModal(true); }} className="hover:text-white p-0.5 rounded transition-colors"><Plus className="w-3 h-3"/></button>
                        <button title="Delete folder" onClick={() => setFolders(folders.filter(f => f.name !== node.path))} className="hover:text-red-400 p-0.5 rounded transition-colors"><Trash2 className="w-3 h-3"/></button>
                      </div>
                    )}
                  </div>
                  {expandedFolders[node.path] && getFolderChildren(node.path).map(child =>
                    child.type === 'file' ? <FileNode key={child.idx} node={child} indent={1}/> : null
                  )}
                </div>
              ) : (
                <FileNode key={node.idx} node={node} />
              )
            )}
          </div>
        </div>

        {/* Main editor */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
          {/* Tabs */}
          <div className="bg-[#252526] flex border-b border-[#3c3c3c] overflow-x-auto shrink-0">
            {files.map((file, idx) => (
              <div key={idx} onClick={() => setActiveFileIndex(idx)}
                className={`group px-3 py-2 text-sm whitespace-nowrap cursor-pointer flex items-center gap-2 border-r border-[#3c3c3c] transition-colors ${activeFileIndex === idx ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-t-blue-500' : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#2a2a2a]'}`}>
                <span>{file.name.includes('/') ? file.name.split('/').pop() : file.name}</span>
                <button onClick={(e) => handleCloseTab(e, idx)} className="opacity-0 group-hover:opacity-100 ml-1 rounded hover:bg-slate-600 hover:text-white transition-all p-0.5">
                  <X className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>

          {/* Typing indicator strip */}
          {onlineUsers.some(u => u.is_typing) && (
            <div className="bg-[#252526] px-4 py-1 text-xs text-slate-400 flex items-center gap-1 border-b border-[#3c3c3c]">
              <span className="flex gap-0.5 items-center">
                {[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </span>
              {onlineUsers.filter(u => u.is_typing).map(u => u.username).join(', ')} {onlineUsers.filter(u=>u.is_typing).length === 1 ? 'is' : 'are'} typing…
            </div>
          )}

          {/* Monaco */}
          <div className="flex-1 relative">
            <EditorComponent
              height="100%"
              language={files[activeFileIndex]?.language || 'javascript'}
              theme="vs-dark"
              value={files[activeFileIndex]?.content || ''}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.onDidChangeCursorPosition(e => {
                  cursorLineRef.current = e.position.lineNumber;
                  cursorColRef.current = e.position.column;
                });
              }}
              options={{ readOnly: !canEdit, minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
              onChange={(value) => {
                if (!canEdit) return;
                const newFiles = [...files];
                newFiles[activeFileIndex].content = value || '';
                setFiles(newFiles);
                // Typing indicator
                isTypingRef.current = true;
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; }, 1500);
              }}
            />
          </div>

          {/* Terminal */}
          <div className="h-48 border-t border-slate-700 bg-black flex flex-col shrink-0">
            <div className="bg-slate-800 px-4 py-2 text-xs font-medium text-slate-400 flex items-center justify-between border-b border-slate-700">
              <span>Terminal Output</span>
              <button onClick={() => setOutput('')} className="hover:text-white transition-colors">Clear</button>
            </div>
            <div className="flex-1 p-4 font-mono text-sm text-green-400 overflow-y-auto whitespace-pre-wrap">{output}</div>
          </div>
        </div>

        {/* Chat FAB */}
        {!chatOpen && (
          <button onClick={() => { setChatOpen(true); setUnreadCount(0); }}
            className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all text-white z-30">
            <MessageSquare className="w-6 h-6"/>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full ring-2 ring-slate-900 transform translate-x-1/4 -translate-y-1/4">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 shadow-2xl z-20">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-400"/><h3 className="font-semibold text-white">Project Chat</h3></div>
              <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50 scroll-smooth">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-10">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                  <p>No messages yet. Start chatting!</p>
                </div>
              ) : messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === user.username ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-slate-500 mb-1 pl-1">{msg.sender === user.username ? 'You' : msg.sender} • {msg.time}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] break-words shadow-sm ${msg.sender === user.username ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 border border-slate-600 rounded-bl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800 shrink-0">
              <div className="relative flex items-center">
                <input type="text" value={currentMessage} onChange={e => setCurrentMessage(e.target.value)} placeholder="Type a message..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-full pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"/>
                <button type="submit" disabled={!currentMessage.trim()}
                  className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4"/>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Invite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Invite Collaborator</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input type="text" required value={inviteUsername} autoComplete="off"
                  onChange={e => setInviteUsername(e.target.value)} placeholder="Enter username to invite"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"/>
                {suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {suggestions.map(s => (
                      <li key={s.id} onClick={() => { setInviteUsername(s.username); setSuggestions([]); }}
                        className="px-4 py-2.5 hover:bg-slate-600 cursor-pointer text-sm text-slate-200 transition-colors border-b border-slate-600/50 last:border-0">
                        {s.username}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg transition-all hover:-translate-y-0.5">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New File/Folder */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm border border-slate-700">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">
                {newItemType === 'folder' ? 'Create New Folder' : 'Create New File'}
                {newItemParentFolder && <span className="text-sm font-normal text-slate-400 ml-2">in /{newItemParentFolder}</span>}
              </h2>
              <button onClick={() => setShowNewItemModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateItem} className="p-5 space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewItemType('file')} className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${newItemType === 'file' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>📄 File</button>
                <button type="button" onClick={() => setNewItemType('folder')} className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${newItemType === 'folder' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' : 'border-slate-700 text-slate-400 hover:bg-slate-700'}`}>📁 Folder</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{newItemType === 'folder' ? 'Folder Name' : 'File Name'}</label>
                <input type="text" required autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  placeholder={newItemType === 'folder' ? 'e.g. src, components' : 'e.g. style.css, script.js'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500"/>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewItemModal(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg transition-all hover:-translate-y-0.5">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg border border-slate-700 max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><History className="w-5 h-5 text-blue-400"/>Version History</h2>
              <button onClick={() => setShowVersionModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-700">
              {versions.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">No versions saved yet. Save your project to create a snapshot.</div>
              ) : versions.map(v => (
                <div key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{v.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">by {v.saved_by} · {v.created_at}</p>
                  </div>
                  <button onClick={() => handleRestoreVersion(v.id, v.label)}
                    className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg border border-blue-500/30 transition-colors">
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
