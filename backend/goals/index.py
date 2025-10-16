import json
import os
from typing import Dict, Any
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor
from decimal import Decimal

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def json_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f'Object of type {type(obj)} is not JSON serializable')

def check_premium_status(cursor, user_id: str) -> bool:
    cursor.execute('''
        SELECT is_premium, premium_expires_at 
        FROM users 
        WHERE id = %s
    ''', (user_id,))
    user = cursor.fetchone()
    if not user:
        return False
    
    if not user['is_premium']:
        return False
    
    if user['premium_expires_at'] and user['premium_expires_at'] < datetime.now():
        cursor.execute('UPDATE users SET is_premium = FALSE WHERE id = %s', (user_id,))
        return False
    
    return True

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage user financial goals (CRUD + update progress)
    Args: event - dict with httpMethod, body, headers
          context - object with request_id attribute
    Returns: HTTP response with goal data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        is_premium = check_premium_status(cursor, user_id)
        
        if method == 'GET':
            cursor.execute('''
                SELECT id, name, target_amount, current_amount, deadline, created_at
                FROM goals
                WHERE user_id = %s AND target_amount > 0
                ORDER BY deadline ASC
            ''', (user_id,))
            
            goals = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'goals': goals, 'isPremium': is_premium}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            if not is_premium:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Premium subscription required', 'premiumRequired': True}),
                    'isBase64Encoded': False
                }
            body = json.loads(event.get('body', '{}'))
            
            cursor.execute('''
                INSERT INTO goals (user_id, name, target_amount, current_amount, deadline)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, name, target_amount, current_amount, deadline, created_at
            ''', (
                user_id,
                body.get('name'),
                body.get('targetAmount'),
                body.get('currentAmount', 0),
                body.get('deadline')
            ))
            
            goal = dict(cursor.fetchone())
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'goal': goal}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            if not is_premium:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Premium subscription required', 'premiumRequired': True}),
                    'isBase64Encoded': False
                }
            
            body = json.loads(event.get('body', '{}'))
            goal_id = body.get('id')
            amount_to_add = body.get('amount', 0)
            
            cursor.execute('''
                UPDATE goals 
                SET current_amount = current_amount + %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s AND user_id = %s
                RETURNING id, name, target_amount, current_amount, deadline
            ''', (amount_to_add, goal_id, user_id))
            
            goal = cursor.fetchone()
            
            if not goal:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Goal not found'}),
                    'isBase64Encoded': False
                }
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'goal': dict(goal)}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            if not is_premium:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Premium subscription required', 'premiumRequired': True}),
                    'isBase64Encoded': False
                }
            
            query_params = event.get('queryStringParameters') or {}
            goal_id = query_params.get('id')
            
            if not goal_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing goal id'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('SELECT id FROM goals WHERE id = %s AND user_id = %s', (goal_id, user_id))
            
            if not cursor.fetchone():
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Goal not found'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('DELETE FROM goals WHERE id = %s AND user_id = %s', (goal_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
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