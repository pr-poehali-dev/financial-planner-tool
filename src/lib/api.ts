const API_URLS = {
  auth: 'https://functions.poehali.dev/a6588cfe-02ca-4f0b-a39b-e9e67abb99ac',
  user: 'https://functions.poehali.dev/87af9df4-1611-4f43-8b8d-6409d1868f0b',
  transactions: 'https://functions.poehali.dev/f588f968-6596-43f6-af72-b68bed862af0',
  goals: 'https://functions.poehali.dev/091e051e-e26b-44b6-9573-1f56eb20f154',
};

export const getUserIdFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  const userIdCookie = cookies.find(c => c.trim().startsWith('userId='));
  return userIdCookie ? userIdCookie.split('=')[1] : null;
};

export const setUserIdCookie = (userId: string) => {
  document.cookie = `userId=${userId}; path=/; max-age=31536000; SameSite=Strict`;
};

export const clearUserIdCookie = () => {
  document.cookie = 'userId=; path=/; max-age=0';
};

export const authenticateWithTelegram = async (authData: any) => {
  const response = await fetch(API_URLS.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authData }),
  });
  return response.json();
};

export const createOrUpdateUser = async (userData: any) => {
  const response = await fetch(API_URLS.user, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const getTransactions = async (userId: string) => {
  const response = await fetch(API_URLS.transactions, {
    method: 'GET',
    headers: { 'X-User-Id': userId },
  });
  return response.json();
};

export const createTransaction = async (userId: string, transaction: any) => {
  const response = await fetch(API_URLS.transactions, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify(transaction),
  });
  return response.json();
};

export const deleteTransaction = async (userId: string, transactionId: string) => {
  const response = await fetch(`${API_URLS.transactions}?id=${transactionId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': userId },
  });
  return response.json();
};

export const getGoals = async (userId: string) => {
  const response = await fetch(API_URLS.goals, {
    method: 'GET',
    headers: { 'X-User-Id': userId },
  });
  return response.json();
};

export const createGoal = async (userId: string, goal: any) => {
  const response = await fetch(API_URLS.goals, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify(goal),
  });
  return response.json();
};

export const updateGoalProgress = async (userId: string, goalId: string, amount: number) => {
  const response = await fetch(API_URLS.goals, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify({ id: goalId, amount }),
  });
  return response.json();
};

export const deleteGoal = async (userId: string, goalId: string) => {
  const response = await fetch(`${API_URLS.goals}?id=${goalId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': userId },
  });
  return response.json();
};
