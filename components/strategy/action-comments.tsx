'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Send,
  Reply,
  Edit,
  Trash2,
  AtSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface ActionCommentsProps {
  actionId: string;
}

export default function ActionComments({ actionId }: ActionCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Comments fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchUsers();
  }, [actionId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          parentId: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        toast.success('Yorum eklendi');
        setNewComment('');
        setReplyTo(null);
        fetchComments();
      }
    } catch (error) {
      toast.error('Yorum eklenirken hata oluştu');
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        toast.success('Yorum güncellendi');
        setEditingComment(null);
        fetchComments();
      }
    } catch (error) {
      toast.error('Yorum güncellenirken hata oluştu');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/api/strategic-actions/${actionId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Yorum silindi');
        fetchComments();
      }
    } catch (error) {
      toast.error('Yorum silinirken hata oluştu');
    }
  };

  const insertMention = (user: any) => {
    const mention = `@[${user.name} ${user.surname || ''}](${user.id})`;
    const cursorPos = textareaRef.current?.selectionStart || newComment.length;
    const textBefore = newComment.substring(0, cursorPos).replace(/@\w*$/, '');
    const textAfter = newComment.substring(cursorPos);
    setNewComment(textBefore + mention + ' ' + textAfter);
    setShowMentionPopover(false);
    setMentionSearch('');
    textareaRef.current?.focus();
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // @ işareti ile başlayan yazı kontrolü
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setShowMentionPopover(true);
    } else {
      setShowMentionPopover(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.surname || ''}`.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const renderContent = (content: string) => {
    // @mention'ları dönüştür
    const mentionRegex = /@\[([^\]]+)\]\([^)]+\)/g;
    const parts = content.split(mentionRegex);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const CommentItem = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => (
    <div className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">
          {comment.author?.name?.charAt(0)}{comment.author?.surname?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {comment.author?.name} {comment.author?.surname}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
          </span>
          {comment.isEdited && (
            <span className="text-xs text-muted-foreground">(düzenlendi)</span>
          )}
        </div>
        
        {editingComment?.id === comment.id ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editingComment.content}
              onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(comment.id, editingComment.content)}>
                Kaydet
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>
                İptal
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm mt-1">{renderContent(comment.content)}</p>
            <div className="flex gap-2 mt-2">
              {!isReply && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => setReplyTo(comment)}
                >
                  <Reply className="h-3 w-3 mr-1" /> Yanıtla
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setEditingComment({ id: comment.id, content: comment.content })}
              >
                <Edit className="h-3 w-3 mr-1" /> Düzenle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-red-500"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Sil
              </Button>
            </div>
          </>
        )}
        
        {/* Yanıtlar */}
        {comment.replies?.map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Yorumlar ({comments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Yeni yorum */}
        <div className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
              <Reply className="h-4 w-4" />
              <span>{replyTo.author?.name}'e yanıt yazıyorsunuz</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 ml-auto"
                onClick={() => setReplyTo(null)}
              >
                İptal
              </Button>
            </div>
          )}
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              placeholder="Yorum yazın... (@ile kullanıcı etiketleyin)"
              className="min-h-[100px]"
            />
            
            {showMentionPopover && filteredUsers.length > 0 && (
              <div className="absolute z-10 bg-popover border rounded-md shadow-md max-h-48 overflow-auto w-64 mt-1">
                {filteredUsers.slice(0, 5).map((user) => (
                  <button
                    key={user.id}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => insertMention(user)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0)}{user.surname?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {user.name} {user.surname}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMentionPopover(!showMentionPopover)}
            >
              <AtSign className="h-4 w-4 mr-1" /> Etiketle
            </Button>
            <Button onClick={handleSubmit} disabled={!newComment.trim()}>
              <Send className="h-4 w-4 mr-2" /> Gönder
            </Button>
          </div>
        </div>

        {/* Yorumlar listesi */}
        <div className="border-t pt-4 space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-4">Yükleniyor...</p>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Henüz yorum yapılmamış</p>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
