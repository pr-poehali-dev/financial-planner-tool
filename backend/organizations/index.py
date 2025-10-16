'''
Business: Manage organizations for premium users (create, read, update, delete)
Args: event with httpMethod, body, queryStringParameters, headers; context with request_id
Returns: HTTP response with organizations data
'''

import json
import os
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, ValidationError
import psycopg


class Organization(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., pattern='^(ИП|ООО|АО)$')
    tax_system: Optional[str] = Field(None, pattern='^(ОСНО|УСН|ЕСХН|ПСН|НПД|АУСН)$')


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
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
    
    # Get user_id from headers
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'}),
            'isBase64Encoded': False
        }
    
    # Get database connection
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg.connect(dsn)
    
    try:
        if method == 'GET':
            return get_organizations(conn, user_id)
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            return create_organization(conn, user_id, body_data)
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            return update_organization(conn, user_id, body_data)
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            org_id = params.get('id')
            return delete_organization(conn, user_id, org_id)
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    finally:
        conn.close()


def get_organizations(conn: psycopg.Connection, user_id: str) -> Dict[str, Any]:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, type, tax_system, created_at, updated_at FROM organizations WHERE user_id = %s ORDER BY created_at DESC",
        (int(user_id),)
    )
    
    rows = cursor.fetchall()
    organizations = []
    
    for row in rows:
        organizations.append({
            'id': row[0],
            'name': row[1],
            'type': row[2],
            'tax_system': row[3],
            'created_at': row[4].isoformat() if row[4] else None,
            'updated_at': row[5].isoformat() if row[5] else None
        })
    
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'organizations': organizations}),
        'isBase64Encoded': False
    }


def create_organization(conn: psycopg.Connection, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    # Check if user is premium
    cursor = conn.cursor()
    cursor.execute("SELECT is_premium FROM users WHERE id = %s", (int(user_id),))
    result = cursor.fetchone()
    
    if not result or not result[0]:
        cursor.close()
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Premium subscription required'}),
            'isBase64Encoded': False
        }
    
    # Validate data
    org = Organization(**data)
    
    # Insert organization
    cursor.execute(
        "INSERT INTO organizations (user_id, name, type, tax_system) VALUES (%s, %s, %s, %s) RETURNING id",
        (int(user_id), org.name, org.type, org.tax_system)
    )
    
    org_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 201,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True, 'id': org_id}),
        'isBase64Encoded': False
    }


def update_organization(conn: psycopg.Connection, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    org_id = data.get('id')
    if not org_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Organization ID required'}),
            'isBase64Encoded': False
        }
    
    # Validate organization belongs to user
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM organizations WHERE id = %s AND user_id = %s", (int(org_id), int(user_id)))
    
    if not cursor.fetchone():
        cursor.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Organization not found'}),
            'isBase64Encoded': False
        }
    
    # Validate data
    org = Organization(**{k: v for k, v in data.items() if k != 'id'})
    
    # Update organization
    cursor.execute(
        "UPDATE organizations SET name = %s, type = %s, tax_system = %s WHERE id = %s",
        (org.name, org.type, org.tax_system, int(org_id))
    )
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }


def delete_organization(conn: psycopg.Connection, user_id: str, org_id: Optional[str]) -> Dict[str, Any]:
    if not org_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Organization ID required'}),
            'isBase64Encoded': False
        }
    
    cursor = conn.cursor()
    cursor.execute("DELETE FROM organizations WHERE id = %s AND user_id = %s", (int(org_id), int(user_id)))
    
    if cursor.rowcount == 0:
        cursor.close()
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Organization not found'}),
            'isBase64Encoded': False
        }
    
    conn.commit()
    cursor.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }
