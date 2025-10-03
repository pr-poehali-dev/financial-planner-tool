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
        if method == 'GET':
            cursor.execute('''
                SELECT id, name, target_amount, current_amount, deadline, created_at
                FROM goals
                WHERE user_id = %s
                ORDER BY deadline ASC
            ''', (user_id,))
            
            goals = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'goals': goals}, default=json_serializer),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
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
            
            cursor.execute('UPDATE goals SET current_amount = 0, target_amount = 0 WHERE id = %s AND user_id = %s', (goal_id, user_id))
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