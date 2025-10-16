const API_URLS = {
  auth: 'https://functions.poehali.dev/a6588cfe-02ca-4f0b-a39b-e9e67abb99ac',
  adminAuth: 'https://functions.poehali.dev/ef619075-2d86-406e-a4a5-455a549df93d',
  adminUsers: 'https://functions.poehali.dev/9171aa5e-d691-45c5-8a70-2609e1958a25',
  transactions: 'https://functions.poehali.dev/f588f968-6596-43f6-af72-b68bed862af0',
  goals: 'https://functions.poehali.dev/091e051e-e26b-44b6-9573-1f56eb20f154',
};

export const getUserIdFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  const userIdCookie = cookies.find(c => c.trim().startsWith('userId='));
  return userIdCookie ? userIdCookie.split('=')[1] : null;
};

export const getAdminIdFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  const adminIdCookie = cookies.find(c => c.trim().startsWith('adminId='));
  return adminIdCookie ? adminIdCookie.split('=')[1] : null;
};

export const setUserIdCookie = (userId: string) => {
  document.cookie = `userId=${userId}; path=/; max-age=31536000; SameSite=Strict`;
};

export const setAdminIdCookie = (adminId: string) => {
  document.cookie = `adminId=${adminId}; path=/; max-age=31536000; SameSite=Strict`;
};

export const clearUserIdCookie = () => {
  document.cookie = 'userId=; path=/; max-age=0';
};

export const clearAdminIdCookie = () => {
  document.cookie = 'adminId=; path=/; max-age=0';
};

export const loginUser = async (email: string, password: string) => {
  const response = await fetch(API_URLS.auth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const loginAdmin = async (email: string, password: string) => {
  const response = await fetch(API_URLS.adminAuth, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const getAdminUsers = async (adminId: string) => {
  const response = await fetch(API_URLS.adminUsers, {
    method: 'GET',
    headers: { 'X-Admin-Id': adminId },
  });
  return response.json();
};

export const createAdminUser = async (adminId: string, firstName: string, lastName: string) => {
  const response = await fetch(API_URLS.adminUsers, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Id': adminId,
    },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  return response.json();
};

export const deleteAdminUser = async (adminId: string, userId: string) => {
  const response = await fetch(`${API_URLS.adminUsers}?id=${userId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Id': adminId },
  });
  return response.json();
};

export const grantPremium = async (adminId: string, userId: string, days: number = 30) => {
  const response = await fetch(API_URLS.adminUsers, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Id': adminId,
    },
    body: JSON.stringify({ userId, action: 'grant_premium', days }),
  });
  return response.json();
};

export const revokePremium = async (adminId: string, userId: string) => {
  const response = await fetch(API_URLS.adminUsers, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Id': adminId,
    },
    body: JSON.stringify({ userId, action: 'revoke_premium' }),
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
  const data = await response.json();
  if (!response.ok) {
    throw { response: { status: response.status, data } };
  }
  return data;
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
  const data = await response.json();
  if (!response.ok) {
    throw { response: { status: response.status, data } };
  }
  return data;
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