'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GripVertical, ChevronDown, ChevronRight, Users, Save, RefreshCw } from 'lucide-react';

interface CommitteeMember {
  id: string;
  role: string;
  jobDescription: string | null;
  responsibilities: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    position?: { name: string } | null;
    department?: { name: string } | null;
  };
}

interface HierarchyMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    position?: { name: string } | null;
    department?: { name: string } | null;
  };
  role: string;
  parentId?: string | null;
  sortOrder?: number;
  children?: HierarchyMember[];
}

interface OrgChartProps {
  committeeId: string;
  members: CommitteeMember[];
  onUpdate?: () => void;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  BASKAN: { label: 'Başkan', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  BASKAN_YARDIMCISI: { label: 'Başkan Yrd.', color: 'bg-orange-100 border-orange-400 text-orange-800' },
  SEKRETER: { label: 'Sekreter', color: 'bg-purple-100 border-purple-400 text-purple-800' },
  UYE: { label: 'Üye', color: 'bg-blue-100 border-blue-400 text-blue-800' },
  GOZLEMCI: { label: 'Gözlemci', color: 'bg-gray-100 border-gray-400 text-gray-800' },
};

export function CommitteeOrgChart({ committeeId, members, onUpdate }: OrgChartProps) {
  const [hierarchy, setHierarchy] = useState<HierarchyMember[]>([]);
  const [flatMembers, setFlatMembers] = useState<HierarchyMember[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hiyerarşi verilerini yükle
  const fetchHierarchy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/committees/${committeeId}/hierarchy`);
      if (res.ok) {
        const data = await res.json();
        setHierarchy(data.hierarchy || []);
        setFlatMembers(data.members || []);
        // Expand all nodes initially
        const expanded = new Set<string>();
        data.hierarchy?.forEach((m: any) => {
          expanded.add(m.id);
          m.children?.forEach((c: any) => expanded.add(c.id));
        });
        setExpandedNodes(expanded);
      }
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  }, [committeeId]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, memberId: string) => {
    setDraggingId(memberId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingId && draggingId !== targetId) {
      setDropTargetId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDropTargetId(null);
      return;
    }

    // Hiyerarşiyi güncelle
    updateHierarchy(draggingId, targetId);
    setDraggingId(null);
    setDropTargetId(null);
  };

  const updateHierarchy = (memberId: string, newParentId: string | null) => {
    // Flat member listesinden kaldır ve yeni parent'a ekle
    const memberToMove = findMemberById(hierarchy, memberId);
    if (!memberToMove) return;

    // Kendini kendi altına taşıyamaz kontrolü
    if (newParentId && isDescendant(memberToMove, newParentId)) {
      toast.error('Bir üzeyi kendi altına taşıyamazsınız');
      return;
    }

    // Deep copy hierarchy
    const newHierarchy = JSON.parse(JSON.stringify(hierarchy));

    // Remove from current position
    removeFromHierarchy(newHierarchy, memberId);

    // Add to new position
    const movedMember = { ...memberToMove, parentId: newParentId, children: memberToMove.children || [] };
    
    if (newParentId === null) {
      // Root level'a ekle
      newHierarchy.push(movedMember);
    } else {
      // Parent'a child olarak ekle
      const parent = findMemberById(newHierarchy, newParentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(movedMember);
      }
    }

    setHierarchy(newHierarchy);
    setHasChanges(true);
  };

  const findMemberById = (nodes: HierarchyMember[], id: string): HierarchyMember | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findMemberById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const removeFromHierarchy = (nodes: HierarchyMember[], id: string): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (nodes[i].children && removeFromHierarchy(nodes[i].children!, id)) {
        return true;
      }
    }
    return false;
  };

  const isDescendant = (node: HierarchyMember, targetId: string): boolean => {
    if (node.id === targetId) return true;
    if (node.children) {
      return node.children.some(child => isDescendant(child, targetId));
    }
    return false;
  };

  const flattenHierarchy = (nodes: HierarchyMember[], parentId: string | null = null, sortStart: number = 0): any[] => {
    const result: any[] = [];
    nodes.forEach((node, index) => {
      result.push({
        memberId: node.id,
        parentMemberId: parentId,
        sortOrder: sortStart + index,
      });
      if (node.children?.length) {
        result.push(...flattenHierarchy(node.children, node.id, 0));
      }
    });
    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const hierarchyData = flattenHierarchy(hierarchy);
      
      const res = await fetch(`/api/committees/${committeeId}/hierarchy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hierarchyData }),
      });

      if (res.ok) {
        toast.success('Organizasyon şeması kaydedildi');
        setHasChanges(false);
        onUpdate?.();
      } else {
        toast.error('Kaydetme başarısız');
      }
    } catch (error) {
      console.error('Error saving hierarchy:', error);
      toast.error('Kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const renderMemberNode = (member: HierarchyMember, depth: number = 0) => {
    const isExpanded = expandedNodes.has(member.id);
    const hasChildren = member.children && member.children.length > 0;
    const isDragging = draggingId === member.id;
    const isDropTarget = dropTargetId === member.id;
    const roleConfig = roleLabels[member.role] || roleLabels.UYE;

    return (
      <div key={member.id} className="mb-2" style={{ marginLeft: depth * 24 }}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, member.id)}
          onDragOver={(e) => handleDragOver(e, member.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, member.id)}
          className={`
            flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-move
            ${isDragging ? 'opacity-50 border-dashed' : ''}
            ${isDropTarget ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}
            ${roleConfig.color}
          `}
        >
          <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
          
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(member.id);
              }}
              className="p-1 hover:bg-white/50 rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className="flex-1">
            <div className="font-medium">
              {member.user.name} {member.user.surname}
            </div>
            <div className="text-sm text-muted-foreground">
              {member.user.position?.name || member.user.department?.name || member.user.email}
            </div>
          </div>

          <Badge variant="outline" className="text-xs">
            {roleConfig.label}
          </Badge>
        </div>

        {/* Alt üyeler (children) */}
        {isExpanded && hasChildren && (
          <div className="mt-2 border-l-2 border-gray-200 ml-4 pl-2">
            {member.children!.map((child) => renderMemberNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <Users className="inline h-4 w-4 mr-1" />
          {flatMembers.length} üye - Sürükle bırak ile hiyerarşiyi düzenleyin
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchHierarchy}
            disabled={saving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          {hasChanges && (
            <Button 
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Drop zone for root level */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (draggingId) setDropTargetId('root');
        }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={(e) => handleDrop(e, null)}
        className={`
          p-4 border-2 border-dashed rounded-lg min-h-[100px] transition-colors
          ${dropTargetId === 'root' ? 'border-green-500 bg-green-50' : 'border-gray-200'}
        `}
      >
        {hierarchy.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Henüz hiyerarşi oluşturulmamış. Üyeleri sürükleyerek düzenlemeye başlayın.
          </div>
        ) : (
          hierarchy.map((member) => renderMemberNode(member))
        )}
      </div>

      {/* Unassigned members */}
      {flatMembers.length > 0 && hierarchy.length === 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-3">Atanmamış Üyeler:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {flatMembers.map((member) => (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  className={`
                    p-2 border rounded cursor-move hover:bg-gray-50 transition-colors
                    ${draggingId === member.id ? 'opacity-50' : ''}
                  `}
                >
                  <div className="text-sm font-medium">
                    {member.user.name} {member.user.surname}
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {roleLabels[member.role]?.label || member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          Değişiklikler kaydedilmedi. Kaydetmek için "Kaydet" butonuna tıklayın.
        </div>
      )}
    </div>
  );
}
