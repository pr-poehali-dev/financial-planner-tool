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
        if method == 'GET':
            cursor.execute('''
                SELECT id, type, amount, category, description, date, created_at
                FROM transactions
                WHERE user_id = %s
                ORDER BY date DESC, created_at DESC
            ''', (user_id,))
            
            transactions = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'transactions': transactions}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            
            cursor.execute('''
                INSERT INTO transactions (user_id, type, amount, category, description, date)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, type, amount, category, description, date, created_at
            ''', (
                user_id,
                body.get('type'),
                body.get('amount'),
                body.get('category'),
                body.get('description', ''),
                body.get('date')
            ))
            
            transaction = dict(cursor.fetchone())
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'transaction': transaction}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
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
            
            cursor.execute('UPDATE transactions SET amount = 0 WHERE id = %s AND user_id = %s', (transaction_id, user_id))
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