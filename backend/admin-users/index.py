import json
import hashlib
import os
import secrets
import string
from typing import Dict, Any
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin panel - create/list users with generated credentials
    Args: event - dict with httpMethod, body, headers
          context - object with request_id attribute
    Returns: HTTP response with user data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    admin_id = headers.get('X-Admin-Id') or headers.get('x-admin-id')
    
    if not admin_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute('SELECT id FROM admin_users WHERE id = %s', (admin_id,))
        if not cursor.fetchone():
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Forbidden'}),
                'isBase64Encoded': False
            }
        
        if method == 'GET':
            cursor.execute('''
                SELECT id, email, first_name, last_name, username, created_at, is_premium, premium_expires_at
                FROM users
                WHERE email IS NOT NULL
                ORDER BY created_at DESC
            ''')
            
            users = []
            for row in cursor.fetchall():
                user = dict(row)
                if 'created_at' in user and user['created_at']:
                    user['created_at'] = user['created_at'].isoformat()
                if 'premium_expires_at' in user and user['premium_expires_at']:
                    user['premium_expires_at'] = user['premium_expires_at'].isoformat()
                users.append(user)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'users': users}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            first_name = body.get('first_name', '')
            last_name = body.get('last_name', '')
            
            email = f"user_{secrets.token_hex(4)}@financeplanner.local"
            password = generate_password()
            username = email.split('@')[0]
            
            print(f"Creating user: email={email}, first_name={first_name}, last_name={last_name}, username={username}")
            
            cursor.execute('''
                INSERT INTO users (email, password_hash, first_name, last_name, username, created_at)
                VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id, email, first_name, last_name, created_at
            ''', (email, hash_password(password), first_name, last_name, username))
            
            user_row = cursor.fetchone()
            if not user_row:
                raise Exception("Failed to create user")
            
            user = dict(user_row)
            if 'created_at' in user and user['created_at']:
                user['created_at'] = user['created_at'].isoformat()
            user['password'] = password
            conn.commit()
            
            print(f"User created successfully: {user}")
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'user': user}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            query_params = event.get('queryStringParameters') or {}
            user_id = query_params.get('id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing user id'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('SELECT id FROM users WHERE id = %s', (user_id,))
            if not cursor.fetchone():
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('UPDATE users SET email = NULL, password_hash = NULL WHERE id = %s', (user_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            user_id = body.get('userId')
            action = body.get('action')
            
            if not user_id or not action:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing userId or action'}),
                    'isBase64Encoded': False
                }
            
            if action == 'grant_premium':
                days = body.get('days', 30)
                expires_at = datetime.now() + timedelta(days=days)
                
                cursor.execute('''
                    UPDATE users 
                    SET is_premium = TRUE, premium_expires_at = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, email, first_name, last_name, is_premium, premium_expires_at
                ''', (expires_at, user_id))
                
                user_row = cursor.fetchone()
                if not user_row:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'}),
                        'isBase64Encoded': False
                    }
                
                conn.commit()
                user = dict(user_row)
                if 'premium_expires_at' in user and user['premium_expires_at']:
                    user['premium_expires_at'] = user['premium_expires_at'].isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'user': user}),
                    'isBase64Encoded': False
                }
            
            elif action == 'revoke_premium':
                cursor.execute('''
                    UPDATE users 
                    SET is_premium = FALSE, premium_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    RETURNING id, email, first_name, last_name, is_premium, premium_expires_at
                ''', (user_id,))
                
                user_row = cursor.fetchone()
                if not user_row:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'}),
                        'isBase64Encoded': False
                    }
                
                conn.commit()
                user = dict(user_row)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'user': user}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid action'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cursor.close()
        conn.close()