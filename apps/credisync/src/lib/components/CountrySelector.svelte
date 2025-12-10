<script>
	import { onMount } from 'svelte';
	import { detectCountry, getCountriesList, saveCountryPreference } from '$lib/utils/countries.js';
	
	let { 
		selectedCountry = $bindable('MX'),
		showDetectionInfo = true,
		disabled = false
	} = $props();
	
	let countries = getCountriesList();
	let detectionInfo = $state(null);
	let detecting = $state(false);
	
	onMount(async () => {
		await detectUserCountry();
	});
	
	async function detectUserCountry() {
		detecting = true;
		
		try {
			const result = await detectCountry();
			selectedCountry = result.country;
			detectionInfo = result;
			
			console.log('🌍 [COUNTRY-SELECTOR] País detectado:', result);
		} catch (error) {
			console.error('❌ [COUNTRY-SELECTOR] Error detectando país:', error);
			selectedCountry = 'MX'; // Fallback
			detectionInfo = {
				country: 'MX',
				method: 'error',
				confidence: 'low'
			};
		} finally {
			detecting = false;
		}
	}
	
	function handleCountryChange() {
		saveCountryPreference(selectedCountry);
		
		// Limpiar info de detección cuando el usuario cambia manualmente
		if (detectionInfo && detectionInfo.method !== 'saved') {
			detectionInfo = {
				...detectionInfo,
				method: 'manual',
				confidence: 'high'
			};
		}
	}
	
	function getDetectionMessage() {
		if (!detectionInfo) return '';
		
		switch (detectionInfo.method) {
			case 'gps':
				return '📍 Detectado por ubicación GPS';
			case 'ip':
				return '🌐 Detectado por ubicación IP';
			case 'saved':
				return '💾 Preferencia guardada';
			case 'manual':
				return '👤 Seleccionado manualmente';
			case 'default':
				return '🇲🇽 País por defecto';
			case 'error':
				return '⚠️ No se pudo detectar, usando México';
			default:
				return '';
		}
	}
	
	function getConfidenceClass() {
		if (!detectionInfo) return '';
		
		switch (detectionInfo.confidence) {
			case 'high':
				return 'confidence-high';
			case 'medium':
				return 'confidence-medium';
			case 'low':
				return 'confidence-low';
			default:
				return '';
		}
	}
</script>

<div class="country-selector">
	<label for="country-select" class="form-label">
		País
		{#if detecting}
			<span class="detecting">🔍 Detectando...</span>
		{/if}
	</label>
	
	<select 
		id="country-select"
		bind:value={selectedCountry}
		onchange={handleCountryChange}
		{disabled}
		class="country-select"
	>
		{#each countries as country (country.code)}
			<option value={country.code}>
				{country.displayName}
			</option>
		{/each}
	</select>
	
	{#if showDetectionInfo && detectionInfo && !detecting}
		<div class="detection-info {getConfidenceClass()}">
			<span class="detection-message">
				{getDetectionMessage()}
			</span>
			
			{#if detectionInfo.confidence === 'low'}
				<span class="detection-hint">
					Puedes cambiar el país si es incorrecto
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.country-selector {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.detecting {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 400;
	}
	
	.country-select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		background: white;
		transition: all 0.2s;
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
		padding-right: 2.5rem;
	}
	
	.country-select:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}
	
	.country-select:disabled {
		background-color: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}
	
	.detection-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		transition: all 0.2s;
	}
	
	.detection-info.confidence-high {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
	}
	
	.detection-info.confidence-medium {
		background: #fffbeb;
		border: 1px solid #fed7aa;
		color: #92400e;
	}
	
	.detection-info.confidence-low {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #991b1b;
	}
	
	.detection-message {
		font-weight: 600;
	}
	
	.detection-hint {
		font-weight: 400;
		opacity: 0.8;
	}
	
	/* Responsive */
	@media (max-width: 640px) {
		.country-select {
			font-size: 0.9375rem;
		}
		
		.detection-info {
			font-size: 0.6875rem;
		}
	}
</style>