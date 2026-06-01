import { useState, useEffect } from "react";
import { makeId } from "../utils/ChatHelpers";
import { TOOLS } from "../data/tools";

const LS_KEY = "a_plus_chat_conversations_v1";
const ACTIVE_KEY = "a_plus_chat_active_v1";

function pickRandomSuggestions() {
    const all = TOOLS.flatMap((t) => t.suggestions || []);
    return [...all].sort(() => 0.5 - Math.random()).slice(0, 3);
}

function createConversation() {
    const now = new Date().toISOString();
    return { id: makeId(), title: "New chat", createdAt: now, updatedAt: now, messages: [] };
}

function autoTitleFromMessage(text) {
    if (!text) return "New chat";
    return text.trim().slice(0, 40).replace(/\s+/g, " ");
}

function saveToLocal(convs, activeId) {
    localStorage.setItem(LS_KEY, JSON.stringify(convs));
    if (activeId !== undefined) {
        localStorage.setItem(ACTIVE_KEY, activeId ?? "");
    }
}

function loadFromLocal() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function useConversations(setMessages, messages) {
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [editingConversationId, setEditingConversationId] = useState(null);
    const [editingConversationTitle, setEditingConversationTitle] = useState("");
    const [deleteConversationTargetId, setDeleteConversationTargetId] = useState(null);
    const [chatSuggestions, setChatSuggestions] = useState([]);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load conversations from localStorage on mount
    useEffect(() => {
        const stored = loadFromLocal();
        if (stored && Array.isArray(stored) && stored.length > 0) {
            setConversations(stored);
        }
        setIsHydrated(true);
    }, []);

    // Persist active conversation ID on change
    useEffect(() => {
        if (activeConversationId) {
            localStorage.setItem(ACTIVE_KEY, activeConversationId);
        }
    }, [activeConversationId]);

    useEffect(() => {
        if (!isHydrated) return;

        const stored = loadFromLocal();
        const convs = stored && Array.isArray(stored) ? stored : [];

        const topChat = convs.length > 0 ? convs[0] : null;

        if (topChat && (topChat.messages?.length === 0 || topChat.title.toLowerCase() === "new chat")) {
            setConversations(convs);
            setActiveConversationId(topChat.id);
            setMessages(topChat.messages || []);
        } else {
            const fresh = createConversation();
            const next = [fresh, ...convs];
            setConversations(next);
            saveToLocal(next, fresh.id);
            setActiveConversationId(fresh.id);
            setMessages([]);
        }

        setChatSuggestions(pickRandomSuggestions());
    }, [isHydrated]);



    const updateActiveMessages = (nextMessages, currentActiveId) => {
        setMessages(nextMessages);
        const convoId = currentActiveId || activeConversationId;

        setConversations((prev) => {
            const now = new Date().toISOString();
            const firstUserMsg = nextMessages.find((m) => m.role === "user" && m.content?.trim());
            const updated = prev.map((c) => {
                if (c.id !== convoId) return c;
                let title = c.title;
                if (title.toLowerCase() === "new chat" && firstUserMsg) {
                    title = autoTitleFromMessage(firstUserMsg.content);
                }
                return { ...c, title, updatedAt: now, messages: nextMessages };
            });
            const sanitized = updated.map((conv) => ({
                ...conv,
                messages: conv.messages.map((msg) => ({
                    ...msg,
                    attachments: (msg.attachments || []).map((a) => ({
                        name: a.name,
                        size: a.size,
                        type: a.type,
                        url: a.url,
                    })),
                })),
            }));

            saveToLocal(sanitized);
            return updated;
        });
    };

    const handleNewChat = () => {
        const fresh = createConversation();
        const next = [fresh, ...conversations];
        setConversations(next);
        saveToLocal(next);
        setActiveConversationId(fresh.id);
        setMessages([]);
        setChatSuggestions(pickRandomSuggestions());
    };

    const handleSelectChat = (id) => {
        setActiveConversationId(id);
        const found = conversations.find((c) => c.id === id);
        setMessages(found?.messages || []);
    };

    const handleDeleteChat = (id) => {
        setDeleteConversationTargetId(id);
    };

    const confirmDeleteChat = () => {
        if (!deleteConversationTargetId) return;
        setConversations((prev) => {
            const next = prev.filter((c) => c.id !== deleteConversationTargetId);
            saveToLocal(next);
            if (deleteConversationTargetId === activeConversationId) {
                if (next.length > 0) {
                    setActiveConversationId(next[0].id);
                    setMessages(next[0].messages || []);
                } else {
                    setActiveConversationId(null);
                    setMessages([]);
                }
            }
            return next;
        });
        setDeleteConversationTargetId(null);
    };

    const startEditChatTitle = (id, currentTitle) => {
        setEditingConversationId(id);
        setEditingConversationTitle(currentTitle || "");
    };

    const saveChatTitle = () => {
        const id = editingConversationId;
        if (!id) return;
        const title = (editingConversationTitle || "").trim() || "New chat";
        setConversations((prev) => {
            const updated = prev.map((c) => (c.id === id ? { ...c, title } : c));
            saveToLocal(updated);
            return updated;
        });
        setEditingConversationId(null);
        setEditingConversationTitle("");
    };

    const cancelChatTitleEdit = () => {
        setEditingConversationId(null);
        setEditingConversationTitle("");
    };

    const handleDeleteAllChats = () => {
        const fresh = createConversation();
        const next = [fresh];
        setConversations(next);
        setMessages([]);
        saveToLocal(next, fresh.id);
        localStorage.removeItem(ACTIVE_KEY);
        setActiveConversationId(fresh.id);
        setChatSuggestions(pickRandomSuggestions());
        setShowDeleteAllModal(false);
    };

    return {
        conversations,
        activeConversationId,
        editingConversationId,
        editingConversationTitle,
        setEditingConversationTitle,
        deleteConversationTargetId,
        setDeleteConversationTargetId,
        chatSuggestions,
        showDeleteAllModal,
        setShowDeleteAllModal,
        updateActiveMessages,
        handleNewChat,
        handleSelectChat,
        handleDeleteChat,
        confirmDeleteChat,
        startEditChatTitle,
        saveChatTitle,
        cancelChatTitleEdit,
        handleDeleteAllChats,
    };
}
