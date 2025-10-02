import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { 
  loginAdmin, 
  getAdminUsers, 
  createAdminUser, 
  deleteAdminUser,
  getAdminIdFromCookie,
  setAdminIdCookie,
  clearAdminIdCookie 
} from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

const Admin = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    const savedAdminId = getAdminIdFromCookie();
    if (savedAdminId) {
      setAdminId(savedAdminId);
      setIsAuthenticated(true);
      loadUsers(savedAdminId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUsers = async (aid: string) => {
    try {
      const result = await getAdminUsers(aid);
      if (result.success) {
        setUsers(result.users);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить пользователей',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await loginAdmin(email, password);

      if (result.success) {
        const aid = result.admin.id.toString();
        setAdminId(aid);
        setAdminIdCookie(aid);
        setIsAuthenticated(true);
        await loadUsers(aid);

        toast({
          title: 'Вход выполнен',
          description: 'Добро пожаловать в админ-панель'
        });
      } else {
        toast({
          title: 'Ошибка входа',
          description: result.error || 'Неверные данные',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при входе',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = () => {
    clearAdminIdCookie();
    setIsAuthenticated(false);
    setAdminId(null);
    setUsers([]);
    toast({
      title: 'Выход выполнен',
      description: 'До свидания!'
    });
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminId) return;

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    try {
      const result = await createAdminUser(adminId, firstName, lastName);

      if (result.success) {
        setUsers([result.user, ...users]);
        setNewUserData({
          email: result.user.email,
          password: result.user.password
        });

        toast({
          title: 'Пользователь создан',
          description: 'Сохраните логин и пароль!'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать пользователя',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!adminId) return;

    try {
      const result = await deleteAdminUser(adminId, userId);

      if (result.success) {
        setUsers(users.filter(u => u.id !== userId));
        toast({
          title: 'Удалено',
          description: 'Пользователь удален'
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: 'Текст скопирован в буфер обмена'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="w-full max-w-md mx-4 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
              <Icon name="Shield" size={32} className="text-white" />
            </div>
            <CardTitle className="text-3xl font-bold">Админ-панель</CardTitle>
            <p className="text-gray-600">Вход для администраторов</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Пароль</Label>
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-blue-600">
                Войти
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Админ-панель</h1>
            <p className="text-gray-600">Управление пользователями</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Icon name="UserPlus" size={18} className="mr-2" />
                  Создать пользователя
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый пользователь</DialogTitle>
                  <DialogDescription>Создайте нового пользователя с логином и паролем</DialogDescription>
                </DialogHeader>
                
                {newUserData ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-green-800 font-medium">Пользователь успешно создан!</p>
                      
                      <div>
                        <Label className="text-xs text-gray-600">Логин (Email)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={newUserData.email} readOnly className="font-mono" />
                          <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => copyToClipboard(newUserData.email)}
                          >
                            <Icon name="Copy" size={16} />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-gray-600">Пароль</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={newUserData.password} readOnly className="font-mono" />
                          <Button 
                            size="icon" 
                            variant="outline"
                            onClick={() => copyToClipboard(newUserData.password)}
                          >
                            <Icon name="Copy" size={16} />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-red-600 font-medium">
                        ⚠️ Сохраните эти данные! Они больше не будут отображаться.
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setNewUserData(null);
                        setIsCreateUserOpen(false);
                      }}
                    >
                      Готово
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <Label htmlFor="firstName">Имя</Label>
                      <Input type="text" name="firstName" placeholder="Иван" required />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Фамилия</Label>
                      <Input type="text" name="lastName" placeholder="Иванов" required />
                    </div>
                    <Button type="submit" className="w-full">Создать</Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={handleLogout}>
              <Icon name="LogOut" size={18} className="mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Пользователи ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Icon name="User" size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Icon name="Mail" size={14} />
                        {user.email}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Создан: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Icon name="Trash2" size={18} />
                  </Button>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Users" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Пользователей пока нет</p>
                  <p className="text-sm mt-2">Создайте первого пользователя</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
