import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', type: 'income', amount: 50000, category: 'Зарплата', date: '2025-10-01', description: 'Октябрь' },
    { id: '2', type: 'expense', amount: 15000, category: 'Продукты', date: '2025-10-02', description: 'Супермаркет' },
    { id: '3', type: 'expense', amount: 8000, category: 'Транспорт', date: '2025-10-02', description: 'Бензин' },
  ]);
  
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', name: 'Отпуск', targetAmount: 100000, currentAmount: 45000, deadline: '2025-12-31' },
    { id: '2', name: 'Новый MacBook', targetAmount: 150000, currentAmount: 80000, deadline: '2026-03-15' },
  ]);

  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month'>('month');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  const balance = transactions.reduce((acc, t) => 
    acc + (t.type === 'income' ? t.amount : -t.amount), 0
  );

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'];

  const addTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: formData.get('type') as 'income' | 'expense',
      amount: Number(formData.get('amount')),
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      description: formData.get('description') as string,
    };
    setTransactions([newTransaction, ...transactions]);
    setIsAddTransactionOpen(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      targetAmount: Number(formData.get('targetAmount')),
      currentAmount: Number(formData.get('currentAmount') || 0),
      deadline: formData.get('deadline') as string,
    };
    setGoals([newGoal, ...goals]);
    setIsAddGoalOpen(false);
  };

  const updateGoalProgress = (id: string, amount: number) => {
    setGoals(goals.map(g => 
      g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Финансовый планировщик</h1>
            <p className="text-gray-600">Управляйте своими финансами эффективно</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Icon name="Plus" size={18} className="mr-2" />
                  Транзакция
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новая транзакция</DialogTitle>
                  <DialogDescription>Добавьте доход или расход</DialogDescription>
                </DialogHeader>
                <form onSubmit={addTransaction} className="space-y-4">
                  <div>
                    <Label htmlFor="type">Тип</Label>
                    <Select name="type" defaultValue="expense" required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Доход</SelectItem>
                        <SelectItem value="expense">Расход</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Сумма</Label>
                    <Input type="number" name="amount" placeholder="0" required />
                  </div>
                  <div>
                    <Label htmlFor="category">Категория</Label>
                    <Input type="text" name="category" placeholder="Продукты, Зарплата..." required />
                  </div>
                  <div>
                    <Label htmlFor="date">Дата</Label>
                    <Input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Описание</Label>
                    <Input type="text" name="description" placeholder="Комментарий" />
                  </div>
                  <Button type="submit" className="w-full">Добавить</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <Icon name="LayoutDashboard" size={16} />
              <span className="hidden sm:inline">Дашборд</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Icon name="ArrowLeftRight" size={16} />
              <span className="hidden sm:inline">Транзакции</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2">
              <Icon name="TrendingUp" size={16} />
              <span className="hidden sm:inline">Статистика</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Icon name="Target" size={16} />
              <span className="hidden sm:inline">Цели</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Текущий баланс</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{balance.toLocaleString('ru-RU')} ₽</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Доходы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">+{totalIncome.toLocaleString('ru-RU')} ₽</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Расходы</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">-{totalExpense.toLocaleString('ru-RU')} ₽</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="PieChart" size={20} />
                    Расходы по категориям
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Target" size={20} />
                    Активные цели
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.slice(0, 3).map(goal => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{goal.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {goal.currentAmount.toLocaleString('ru-RU')} / {goal.targetAmount.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                  {goals.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Нет активных целей
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Clock" size={20} />
                  Последние транзакции
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          <Icon 
                            name={transaction.type === 'income' ? 'TrendingUp' : 'TrendingDown'} 
                            size={18}
                            className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{transaction.category}</div>
                          <div className="text-sm text-muted-foreground">{transaction.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('ru-RU')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Все транзакции</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map(transaction => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                          <Icon 
                            name={transaction.type === 'income' ? 'ArrowDownLeft' : 'ArrowUpRight'} 
                            size={18}
                            className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{transaction.category}</div>
                          <div className="text-sm text-muted-foreground">{transaction.description}</div>
                        </div>
                        <div className="text-right mr-4">
                          <div className={`font-semibold text-lg ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('ru-RU')} ₽
                          </div>
                          <div className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString('ru-RU')}</div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Icon name="Trash2" size={18} />
                      </Button>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">
                      Нет транзакций
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="day">День</TabsTrigger>
                  <TabsTrigger value="week">Неделя</TabsTrigger>
                  <TabsTrigger value="month">Месяц</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="BarChart3" size={20} />
                  Доходы и расходы
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Доходы', amount: totalIncome },
                    { name: 'Расходы', amount: totalExpense },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="PieChart" size={20} />
                  Детализация по категориям
                </CardTitle>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, value }) => `${name}: ${value.toLocaleString('ru-RU')} ₽`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Icon name="Plus" size={18} className="mr-2" />
                    Новая цель
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Новая финансовая цель</DialogTitle>
                    <DialogDescription>Установите цель и отслеживайте прогресс</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addGoal} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Название</Label>
                      <Input type="text" name="name" placeholder="Отпуск, Машина..." required />
                    </div>
                    <div>
                      <Label htmlFor="targetAmount">Целевая сумма</Label>
                      <Input type="number" name="targetAmount" placeholder="0" required />
                    </div>
                    <div>
                      <Label htmlFor="currentAmount">Текущая сумма</Label>
                      <Input type="number" name="currentAmount" placeholder="0" defaultValue="0" />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Дедлайн</Label>
                      <Input type="date" name="deadline" required />
                    </div>
                    <Button type="submit" className="w-full">Создать цель</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {goals.map(goal => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const isCompleted = progress >= 100;
                
                return (
                  <Card key={goal.id} className={`${isCompleted ? 'border-green-500 bg-green-50' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Icon name="Target" size={20} className={isCompleted ? 'text-green-600' : ''} />
                            {goal.name}
                            {isCompleted && (
                              <span className="text-sm bg-green-500 text-white px-2 py-1 rounded-full">Достигнута</span>
                            )}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            До {new Date(goal.deadline).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteGoal(goal.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Icon name="Trash2" size={18} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-2xl font-bold">
                            {goal.currentAmount.toLocaleString('ru-RU')} ₽
                          </span>
                          <span className="text-sm text-muted-foreground">
                            из {goal.targetAmount.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-3" />
                        <p className="text-sm text-muted-foreground mt-1 text-right">
                          {progress.toFixed(1)}%
                        </p>
                      </div>
                      
                      {!isCompleted && (
                        <div className="flex gap-2">
                          <Input 
                            type="number" 
                            placeholder="Сумма пополнения"
                            id={`goal-amount-${goal.id}`}
                            className="flex-1"
                          />
                          <Button 
                            onClick={() => {
                              const input = document.getElementById(`goal-amount-${goal.id}`) as HTMLInputElement;
                              const amount = Number(input.value);
                              if (amount > 0) {
                                updateGoalProgress(goal.id, amount);
                                input.value = '';
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Icon name="Plus" size={18} />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {goals.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Icon name="Target" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет финансовых целей</p>
                    <p className="text-sm mt-2">Создайте первую цель, чтобы начать копить</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
