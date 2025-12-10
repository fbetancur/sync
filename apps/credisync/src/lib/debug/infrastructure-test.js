/**
 * Herramientas de debugging para verificar la Universal Infrastructure
 * Usar en la consola del navegador
 */

import { crediSyncApp } from '$lib/app-config.js';

// Exponer funciones globales para testing en consola
window.testInfrastructure = {
	
	// 1. SYNC MANAGER
	async checkSyncManager() {
		console.log('🔄 === TESTING SYNC MANAGER ===');
		
		const syncManager = crediSyncApp.services.sync;
		
		console.log('📊 Sync Status:', {
			isOnline: navigator.onLine,
			isSyncing: syncManager.isCurrentlySyncing(),
			queueSize: await syncManager.getQueueSize(),
			lastSync: syncManager.getLastSyncTime()
		});
		
		// Test manual sync
		console.log('🔄 Triggering manual sync...');
		const result = await syncManager.sync({ force: true });
		console.log('✅ Sync result:', result);
		
		return result;
	},
	
	// 2. CONFLICT RESOLVER
	async checkConflictResolver() {
		console.log('⚔️ === TESTING CONFLICT RESOLVER ===');
		
		const resolver = crediSyncApp.services.conflictResolver;
		
		// Crear dos versiones conflictivas de un cliente
		const localRecord = {
			id: 'test-conflict',
			nombre: 'Cliente Local',
			telefono: '111-1111',
			version_vector: { 'device1': 1 },
			updated_at: Date.now() - 1000
		};
		
		const remoteRecord = {
			id: 'test-conflict',
			nombre: 'Cliente Remoto',
			telefono: '222-2222',
			version_vector: { 'device2': 1 },
			updated_at: Date.now()
		};
		
		console.log('🔍 Local record:', localRecord);
		console.log('🔍 Remote record:', remoteRecord);
		
		const resolution = resolver.resolveConflict(localRecord, remoteRecord, 'clientes');
		console.log('✅ Conflict resolution:', resolution);
		
		return resolution;
	},
	
	// 3. STORAGE MANAGER
	async checkStorageManager() {
		console.log('💾 === TESTING STORAGE MANAGER ===');
		
		const storage = crediSyncApp.services.storage;
		
		// Test write to all layers
		const testData = { id: 'test-storage', data: 'test-value', timestamp: Date.now() };
		
		console.log('📝 Writing to all storage layers...');
		const writeResult = await storage.write(testData, {
			tableName: 'test_table',
			recordId: 'test-storage'
		});
		console.log('✅ Write result:', writeResult);
		
		// Test read with fallback
		console.log('📖 Reading with fallback...');
		const readResult = await storage.read({
			tableName: 'test_table',
			recordId: 'test-storage'
		});
		console.log('✅ Read result:', readResult);
		
		return { writeResult, readResult };
	},
	
	// 4. AUDIT LOGGER
	async checkAuditLogger() {
		console.log('📋 === TESTING AUDIT LOGGER ===');
		
		const audit = crediSyncApp.services.audit;
		
		// Log test event
		console.log('📝 Logging test event...');
		await audit.logEvent({
			tenant_id: '00000000-0000-0000-0000-000000000001',
			user_id: 'test-user',
			device_id: crediSyncApp.services.db.deviceId,
			event_type: 'TEST',
			aggregate_type: 'CLIENTE',
			aggregate_id: 'test-cliente',
			data: { action: 'infrastructure_test', timestamp: Date.now() }
		});
		
		// Get recent audit logs
		console.log('📖 Getting recent audit logs...');
		const logs = await crediSyncApp.services.db.audit_log
			.orderBy('timestamp')
			.reverse()
			.limit(5)
			.toArray();
		
		console.log('✅ Recent audit logs:', logs);
		
		// Verify hash chain
		if (logs.length >= 2) {
			const isChainValid = logs[1].hash === logs[0].previous_hash;
			console.log('🔗 Hash chain valid:', isChainValid);
		}
		
		return logs;
	},
	
	// 5. INTEGRITY CHECKER
	async checkIntegrityChecker() {
		console.log('🔍 === TESTING INTEGRITY CHECKER ===');
		
		const checksum = crediSyncApp.services.checksum;
		
		// Test checksum calculation
		const testData = { id: 'test', nombre: 'Test Cliente', telefono: '123-456' };
		const hash1 = checksum.calculateChecksum(testData);
		const hash2 = checksum.calculateChecksum(testData);
		
		console.log('🔢 Checksum 1:', hash1);
		console.log('🔢 Checksum 2:', hash2);
		console.log('✅ Checksums match:', hash1 === hash2);
		
		// Test with modified data
		const modifiedData = { ...testData, telefono: '999-999' };
		const hash3 = checksum.calculateChecksum(modifiedData);
		console.log('🔢 Modified checksum:', hash3);
		console.log('✅ Different checksums:', hash1 !== hash3);
		
		return { original: hash1, modified: hash3, match: hash1 === hash2 };
	},
	
	// 6. DATABASE
	async checkDatabase() {
		console.log('🗄️ === TESTING DATABASE ===');
		
		const db = crediSyncApp.services.db;
		
		// Get database stats
		console.log('📊 Getting database stats...');
		const stats = await db.getStats();
		console.log('✅ Database stats:', stats);
		
		// Test transaction
		console.log('💳 Testing transaction...');
		try {
			await db.transaction('rw', [db.clientes], async () => {
				console.log('📝 Inside transaction...');
				// Transaction test - no actual changes
			});
			console.log('✅ Transaction successful');
		} catch (error) {
			console.error('❌ Transaction failed:', error);
		}
		
		return stats;
	},
	
	// 7. AUTH SERVICE
	async checkAuthService() {
		console.log('🔐 === TESTING AUTH SERVICE ===');
		
		const auth = crediSyncApp.services.auth;
		
		console.log('👤 Current user:', await auth.getCurrentUser());
		console.log('🎫 Current session:', await auth.getCurrentSession());
		console.log('✅ Auth service initialized:', auth.isInitialized());
		
		return {
			user: await auth.getCurrentUser(),
			session: await auth.getCurrentSession(),
			initialized: auth.isInitialized()
		};
	},
	
	// 8. CONNECTION STATUS
	checkConnectionStatus() {
		console.log('🌐 === TESTING CONNECTION STATUS ===');
		
		const status = {
			online: navigator.onLine,
			connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
			timestamp: Date.now()
		};
		
		console.log('📡 Connection status:', status);
		
		// Test offline simulation
		console.log('💡 To test offline: Open DevTools > Network > Set to Offline');
		console.log('💡 To test sync queue: Go offline, create client, go online');
		
		return status;
	},
	
	// 9. COMPLETE TEST SUITE
	async runAllTests() {
		console.log('🚀 === RUNNING COMPLETE INFRASTRUCTURE TEST ===');
		
		const results = {};
		
		try {
			results.connection = this.checkConnectionStatus();
			results.database = await this.checkDatabase();
			results.auth = await this.checkAuthService();
			results.sync = await this.checkSyncManager();
			results.storage = await this.checkStorageManager();
			results.audit = await this.checkAuditLogger();
			results.integrity = await this.checkIntegrityChecker();
			results.conflicts = await this.checkConflictResolver();
			
			console.log('🎉 === ALL TESTS COMPLETED ===');
			console.log('📊 Complete results:', results);
			
		} catch (error) {
			console.error('❌ Test suite failed:', error);
			results.error = error.message;
		}
		
		return results;
	},
	
	// 10. HELPER FUNCTIONS
	async clearAllData() {
		console.log('🧹 === CLEARING ALL DATA ===');
		await crediSyncApp.services.db.clearAll();
		console.log('✅ All data cleared');
	},
	
	async getAppStatus() {
		return await crediSyncApp.getStatus();
	}
};

console.log('🎯 Infrastructure testing tools loaded!');
console.log('💡 Use: testInfrastructure.runAllTests() to run complete test');
console.log('💡 Use: testInfrastructure.checkSyncManager() for specific tests');