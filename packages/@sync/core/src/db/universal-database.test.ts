/**
 * Universal Database Tests
 * 
 * Basic unit tests for the Universal Database functionality.
 * These tests verify core CRUD operations and schema generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversalDatabase } from './universal-database';
import { DatabaseFactory } from './database-factory';
import type { DatabaseConfig } from '@sync/types';

// Test schema configuration
const testSchema: DatabaseConfig = {
  name: 'test_db',
  multiTenant: true,
  tables: {
    users: {
      fields: ['name', 'email', 'active'],
      indexes: ['email', 'active'],
      required: ['name', 'email'],
      unique: ['email'],
      fieldTypes: {
        name: 'string',
        email: 'email',
        active: 'boolean'
      }
    },
    posts: {
      fields: ['title', 'content', 'user_id', 'published'],
      indexes: ['user_id', 'published'],
      relationships: {
        user_id: 'users.id'
      },
      required: ['title', 'user_id'],
      fieldTypes: {
        title: 'string',
        content: 'text',
        user_id: 'string',
        published: 'boolean'
      }
    }
  }
};

describe('UniversalDatabase', () => {
  let db: UniversalDatabase;

  beforeEach(async () => {
    db = new UniversalDatabase(testSchema);
    await db.initialize();
  });

  afterEach(async () => {
    if (db) {
      await db.clearAll();
      db.close();
    }
  });

  it('should create database with correct schema', () => {
    expect(db.name).toBe('test_db');
    expect(db.getUserTables()).toEqual(['users', 'posts']);
    expect(db.hasTable('users')).toBe(true);
    expect(db.hasTable('posts')).toBe(true);
    expect(db.hasTable('nonexistent')).toBe(false);
  });

  it('should get table metadata', () => {
    const usersMetadata = db.getTableMetadata('users');
    expect(usersMetadata).toBeDefined();
    expect(usersMetadata.name).toBe('users');
    expect(usersMetadata.allFields).toContain('name');
    expect(usersMetadata.allFields).toContain('email');
    expect(usersMetadata.allFields).toContain('id'); // Technical field
    expect(usersMetadata.allFields).toContain('tenant_id'); // Multi-tenant field
  });

  it('should create record with technical fields', async () => {
    const user = await db.createRecord('users', {
      name: 'John Doe',
      email: 'john@example.com',
      active: true,
      tenant_id: 'tenant-1'
    }, {
      userId: 'admin',
      deviceId: 'device-1'
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@example.com');
    expect(user.tenant_id).toBe('tenant-1');
    expect(user.created_at).toBeDefined();
    expect(user.updated_at).toBeDefined();
    expect(user.created_by).toBe('admin');
    expect(user.version_vector).toBeDefined();
    expect(user.field_versions).toBeDefined();
    expect(user.synced).toBe(false);
  });

  it('should update record with CRDT versioning', async () => {
    // Create initial record
    const user = await db.createRecord('users', {
      name: 'Jane Doe',
      email: 'jane@example.com',
      active: true,
      tenant_id: 'tenant-1'
    }, {
      userId: 'admin',
      deviceId: 'device-1'
    });

    // Update record
    const updatedUser = await db.updateRecord('users', user.id, {
      name: 'Jane Smith',
      active: false
    }, {
      userId: 'admin',
      deviceId: 'device-1'
    });

    expect(updatedUser).toBeDefined();
    expect(updatedUser!.name).toBe('Jane Smith');
    expect(updatedUser!.active).toBe(false);
    expect(updatedUser!.version_vector['device-1']).toBe(2);
    expect(updatedUser!.field_versions.name.value).toBe('Jane Smith');
    expect(updatedUser!.synced).toBe(false);
  });

  it('should query records with tenant filtering', async () => {
    // Create records for different tenants
    await db.createRecord('users', {
      name: 'User 1',
      email: 'user1@example.com',
      active: true,
      tenant_id: 'tenant-1'
    });

    await db.createRecord('users', {
      name: 'User 2',
      email: 'user2@example.com',
      active: true,
      tenant_id: 'tenant-2'
    });

    await db.createRecord('users', {
      name: 'User 3',
      email: 'user3@example.com',
      active: true,
      tenant_id: 'tenant-1'
    });

    // Query by tenant
    const tenant1Users = await db.queryRecords('users', {
      tenantId: 'tenant-1'
    }).toArray();

    const tenant2Users = await db.queryRecords('users', {
      tenantId: 'tenant-2'
    }).toArray();

    expect(tenant1Users).toHaveLength(2);
    expect(tenant2Users).toHaveLength(1);
    expect(tenant1Users[0].tenant_id).toBe('tenant-1');
    expect(tenant2Users[0].tenant_id).toBe('tenant-2');
  });

  it('should soft delete records', async () => {
    const user = await db.createRecord('users', {
      name: 'Delete Me',
      email: 'delete@example.com',
      active: true,
      tenant_id: 'tenant-1'
    });

    // Soft delete
    const deleted = await db.deleteRecord('users', user.id, {
      soft: true,
      userId: 'admin'
    });

    expect(deleted).toBe(true);

    // Verify record is marked as deleted
    const record = await db.getTable('users').get(user.id);
    expect(record).toBeDefined();
    expect((record as any).deleted_at).toBeDefined();
    expect((record as any).deleted_by).toBe('admin');

    // Verify it's filtered out of normal queries
    const activeUsers = await db.queryRecords('users', {
      tenantId: 'tenant-1'
    }).toArray();

    expect(activeUsers.find(u => u.id === user.id)).toBeUndefined();
  });

  it('should get database statistics', async () => {
    await db.createRecord('users', {
      name: 'User 1',
      email: 'user1@example.com',
      active: true,
      tenant_id: 'tenant-1'
    });

    await db.createRecord('posts', {
      title: 'Post 1',
      content: 'Content 1',
      user_id: 'user-1',
      published: true,
      tenant_id: 'tenant-1'
    });

    const stats = await db.getStats();
    
    expect(stats.tables.users).toBe(1);
    expect(stats.tables.posts).toBe(1);
    expect(stats.userTables).toBe(2);
    expect(stats.systemTables).toBe(5); // sync_queue, audit_log, etc.
  });
});

describe('DatabaseFactory', () => {
  it('should create universal database', () => {
    const db = DatabaseFactory.createUniversal(testSchema);
    expect(db).toBeInstanceOf(UniversalDatabase);
    expect(DatabaseFactory.isUniversal(db)).toBe(true);
    expect(DatabaseFactory.getDatabaseType(db)).toBe('universal');
  });

  it('should create legacy database', () => {
    const db = DatabaseFactory.createLegacy();
    expect(DatabaseFactory.isLegacy(db)).toBe(true);
    expect(DatabaseFactory.getDatabaseType(db)).toBe('legacy');
  });

  it('should auto-detect database type from app config', () => {
    // Should create legacy for CrediSync
    const crediDB = DatabaseFactory.createFromAppConfig({
      appName: 'CrediSync'
    });
    expect(DatabaseFactory.isLegacy(crediDB)).toBe(true);

    // Should create universal for new app with schema
    const newDB = DatabaseFactory.createFromAppConfig({
      appName: 'NewApp',
      database: testSchema
    });
    expect(DatabaseFactory.isUniversal(newDB)).toBe(true);

    // Should default to legacy without schema
    const defaultDB = DatabaseFactory.createFromAppConfig({
      appName: 'UnknownApp'
    });
    expect(DatabaseFactory.isLegacy(defaultDB)).toBe(true);
  });
});