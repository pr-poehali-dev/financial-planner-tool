import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: number;
  name: string;
  type: 'ИП' | 'ООО' | 'АО';
  tax_system?: 'ОСНО' | 'УСН' | 'ЕСХН' | 'ПСН' | 'НПД' | 'АУСН';
  created_at: string;
  updated_at: string;
}

interface OrganizationsManagerProps {
  userId: string;
  organizations: Organization[];
  onUpdate: () => void;
}

export default function OrganizationsManager({ userId, organizations, onUpdate }: OrganizationsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ИП' as 'ИП' | 'ООО' | 'АО',
    tax_system: '' as '' | 'ОСНО' | 'УСН' | 'ЕСХН' | 'ПСН' | 'НПД' | 'АУСН'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        type: org.type,
        tax_system: org.tax_system || ''
      });
    } else {
      setEditingOrg(null);
      setFormData({ name: '', type: 'ИП', tax_system: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingOrg 
        ? '/api/organizations'
        : '/api/organizations';
      
      const method = editingOrg ? 'PUT' : 'POST';
      const body = editingOrg
        ? { ...formData, id: editingOrg.id, tax_system: formData.tax_system || null }
        : { ...formData, tax_system: formData.tax_system || null };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: editingOrg ? 'Организация обновлена' : 'Организация создана',
          description: `${formData.name} успешно ${editingOrg ? 'обновлена' : 'добавлена'}`
        });
        setIsDialogOpen(false);
        onUpdate();
      } else {
        toast({
          title: 'Ошибка',
          description: result.error || 'Не удалось сохранить организацию',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving organization:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить организацию',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (orgId: number) => {
    if (!confirm('Удалить организацию?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizations?id=${orgId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId }
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Организация удалена',
          description: 'Организация успешно удалена'
        });
        onUpdate();
      } else {
        toast({
          title: 'Ошибка',
          description: result.error || 'Не удалось удалить организацию',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить организацию',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Building2" size={24} />
              Мои организации
            </CardTitle>
            <CardDescription>Управление вашими организациями</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Icon name="Plus" size={16} />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingOrg ? 'Редактировать' : 'Добавить'} организацию</DialogTitle>
                <DialogDescription>
                  Укажите данные организации для учёта доходов и расходов
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название организации *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ИП Иванов И.И."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Тип организации *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'ИП' | 'ООО' | 'АО') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ИП">ИП</SelectItem>
                        <SelectItem value="ООО">ООО</SelectItem>
                        <SelectItem value="АО">АО</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_system">Система налогообложения</Label>
                    <Select
                      value={formData.tax_system}
                      onValueChange={(value: '' | 'ОСНО' | 'УСН' | 'ЕСХН' | 'ПСН' | 'НПД' | 'АУСН') => 
                        setFormData({ ...formData, tax_system: value })
                      }
                    >
                      <SelectTrigger id="tax_system">
                        <SelectValue placeholder="Не выбрано" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Не выбрано</SelectItem>
                        <SelectItem value="ОСНО">ОСНО</SelectItem>
                        <SelectItem value="УСН">УСН</SelectItem>
                        <SelectItem value="ЕСХН">ЕСХН</SelectItem>
                        <SelectItem value="ПСН">ПСН</SelectItem>
                        <SelectItem value="НПД">НПД</SelectItem>
                        <SelectItem value="АУСН">АУСН</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="Building2" size={48} className="mx-auto mb-2 opacity-50" />
            <p>Нет организаций</p>
            <p className="text-sm">Добавьте первую организацию для учёта</p>
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold">{org.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {org.type}
                    {org.tax_system && ` • ${org.tax_system}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(org)}
                    disabled={isLoading}
                  >
                    <Icon name="Pencil" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(org.id)}
                    disabled={isLoading}
                  >
                    <Icon name="Trash2" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
