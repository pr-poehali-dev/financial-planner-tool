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
    Business: Manage user transactions (CRUD operations)
    Args: event - dict with httpMethod, body, headers
          context - object with request_id attribute
    Returns: HTTP response with transaction data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
                SELECT id, type, amount, category, description, date, created_at
                FROM transactions
                WHERE user_id = %s AND amount > 0
                ORDER BY date DESC, created_at DESC
            ''', (user_id,))
            
            transactions = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'transactions': transactions, 'isPremium': is_premium}, default=json_serializer),
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
            
            try:
                body = json.loads(event.get('body', '{}'))
                
                trans_type = body.get('type')
                amount = body.get('amount')
                category = body.get('category')
                date_val = body.get('date')
                
                if not trans_type or trans_type not in ['income', 'expense']:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid transaction type', 'success': False}),
                        'isBase64Encoded': False
                    }
                
                if not amount or float(amount) <= 0:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid amount', 'success': False}),
                        'isBase64Encoded': False
                    }
                
                if not category:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Category is required', 'success': False}),
                        'isBase64Encoded': False
                    }
                
                cursor.execute('''
                    INSERT INTO transactions (user_id, type, amount, category, description, date)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, type, amount, category, description, date, created_at
                ''', (
                    user_id,
                    trans_type,
                    float(amount),
                    category,
                    body.get('description', ''),
                    date_val
                ))
                
                transaction = dict(cursor.fetchone())
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'transaction': transaction}, default=json_serializer),
                    'isBase64Encoded': False
                }
            except Exception as e:
                conn.rollback()
                return {
                    'statusCode': 500,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': f'Failed to create transaction: {str(e)}', 'success': False}),
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
            transaction_id = query_params.get('id')
            
            if not transaction_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Missing transaction id'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('''
                SELECT id FROM transactions WHERE id = %s AND user_id = %s
            ''', (transaction_id, user_id))
            
            if not cursor.fetchone():
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Transaction not found'}),
                    'isBase64Encoded': False
                }
            
            cursor.execute('DELETE FROM transactions WHERE id = %s AND user_id = %s', (transaction_id, user_id))
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