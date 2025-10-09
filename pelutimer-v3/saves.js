(function(){
	'use strict';

	// Small module for managing saved timer-sets (one per date)
	// Storage key: pelutimer_v3_saves -> { 'YYYY-MM-DD': { timers: [..], labels:[..], savedAt: epoch }}

	function storageGet(key){ try { return localStorage.getItem(key) } catch(e){ console.warn(e); return null } }
	function storageSet(key,val){ try{ localStorage.setItem(key,val) }catch(e){console.warn(e)} }

	const KEY = 'pelutimer_v3_saves';

	function todayKey(){
		const d = new Date();
		return d.toISOString().slice(0,10); // YYYY-MM-DD
	}

	function loadAll(){
		const raw = storageGet(KEY);
		if(!raw) return {};
		try{ return JSON.parse(raw) || {} }catch(e){console.warn('bad saves payload',e); return {} }
	}

	function saveAll(obj){ storageSet(KEY, JSON.stringify(obj)) }

	function render(){
		const container = document.getElementById('savesList');
		if(!container) return;
		container.innerHTML = '';
		const all = loadAll();
		const tkey = todayKey();
		const keys = Object.keys(all).filter(k=>k!==tkey).sort().reverse(); // newest first, exclude today
			keys.forEach(k => {
				const set = all[k];
				const row = document.createElement('div');
				row.className = 'save-row';

				const dateDiv = document.createElement('div');
				dateDiv.className = 'save-date';
				dateDiv.textContent = k;
				row.appendChild(dateDiv);

				const valueDiv = createSaveValueElement(set);
				row.appendChild(valueDiv);

				const actions = document.createElement('div');
				actions.className = 'save-actions';
				const btnSave = document.createElement('button'); btnSave.className = 'action-btn save-save'; btnSave.dataset.date = k; btnSave.textContent = 'Save';
				const btnLoad = document.createElement('button'); btnLoad.className = 'action-btn load-save'; btnLoad.dataset.date = k; btnLoad.textContent = 'Load';
				const btnDel = document.createElement('button'); btnDel.className = 'action-btn delete-save'; btnDel.dataset.date = k; btnDel.title = 'Delete'; btnDel.textContent = '✖';
				actions.appendChild(btnSave); actions.appendChild(btnLoad); actions.appendChild(btnDel);
				row.appendChild(actions);

				container.appendChild(row);
			});
	}

	function formatSet(set){
		if(!set || !Array.isArray(set.timers)) return '(empty)';
		const colors = ['blue','red','yellow','green'];
		const labels = Array.isArray(set.labels) ? set.labels : ['Blue','Red','Yellow','Green'];
		// build a small HTML block showing each timer with a color swatch, label and time
		return set.timers.map((t, i) => {
			const color = colors[i] || 'blue';
			const lbl = labels[i] || `Timer ${i+1}`;
			const time = formatHHMMSS(Number(t)||0);
			return `
				<div class="save-timer" style="display:flex;align-items:center;gap:8px;margin:6px 0">
					<span class="legend-color ${color}"></span>
					<span class="save-timer-label" style="flex:1;color:inherit;font-weight:600">${escapeHtml(lbl)}</span>
					<span class="save-timer-time" style="font-variant-numeric:tabular-nums;font-weight:600">${time}</span>
				</div>`;
		}).join('');
	}

// minimal HTML escape for labels
	function escapeHtml(s){
		if(!s) return '';
		return String(s).replace(/[&<>"']/g, function(c){
			switch(c){
				case '&': return '&amp;';
				case '<': return '&lt;';
				case '>': return '&gt;';
				case '"': return '&quot;';
				case "'": return '&#39;';
			}
		});
	}

	// Reuse the same format function from main script if present, otherwise provide a minimal one
	function formatHHMMSS(totalSec){
		const sec = Math.floor(totalSec % 60);
		const min = Math.floor((totalSec / 60) % 60);
		const hrs = Math.floor(totalSec / 3600);
		const pad = (n) => String(n).padStart(2, '0');
		return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
	}

	// build a DOM element for the saved-set value (one or more timers)
	function createSaveValueElement(set){
		const wrapper = document.createElement('div');
		wrapper.className = 'save-value';
		if(!set || !Array.isArray(set.timers)){
			wrapper.textContent = '(empty)';
			return wrapper;
		}
		const colors = ['blue','red','yellow','green'];
		const labels = Array.isArray(set.labels) ? set.labels : ['Blue','Red','Yellow','Green'];
		set.timers.forEach((t,i)=>{
			const row = document.createElement('div');
			row.className = 'save-timer';
			row.style.display = 'flex';
			row.style.alignItems = 'center';
			row.style.gap = '8px';
			row.style.margin = '6px 0';

			const sw = document.createElement('span');
			sw.className = `legend-color ${colors[i] || 'blue'}`;
			// styling handled by CSS
			row.appendChild(sw);

			const lbl = document.createElement('span');
			lbl.className = 'save-timer-label';
			lbl.style.flex = '1';
			lbl.style.fontWeight = '600';
			lbl.textContent = labels[i] || `Timer ${i+1}`;
			row.appendChild(lbl);

			const tim = document.createElement('span');
			tim.className = 'save-timer-time';
			tim.style.fontVariantNumeric = 'tabular-nums';
			tim.style.fontWeight = '600';
			tim.textContent = formatHHMMSS(Number(t)||0);
			row.appendChild(tim);

			wrapper.appendChild(row);
		});
		return wrapper;
	}

	function wire(){
		const today = document.getElementById('todayDate');
		const tv = document.getElementById('todayValue');
		const tSave = document.getElementById('todaySave');
		const tLoad = document.getElementById('todayLoad');
		if(today) today.textContent = todayKey();

		// populate today's value if saved
		const all = loadAll();
		const tkey = todayKey();
		if(all[tkey]){
			if(tv){
				const el = createSaveValueElement(all[tkey]);
				tv.innerHTML = '';
				tv.appendChild(el);
			}
		} else {
			if(tv) tv.textContent = '(empty)';
		}

		if(tSave) tSave.addEventListener('click', ()=>{
			if(!window.timerManager) return; // not ready
			const payload = {
				timers: window.timerManager.timers.map(v=>Math.floor(v)),
				labels: window.timerManager.labels.slice(),
				savedAt: Date.now()
			};
			const all2 = loadAll();
			all2[tkey] = payload;
			saveAll(all2);
			render();
			if(tv){ tv.innerHTML = ''; tv.appendChild(createSaveValueElement(payload)); }
			console.debug('Saved current timers to', tkey);
		});

		if(tLoad) tLoad.addEventListener('click', ()=>{
			if(!window.timerManager) return;
			const all2 = loadAll();
			if(!all2[tkey]) return;
			const set = all2[tkey];
			window.timerManager.timers = set.timers.map(n=>Number(n)||0);
			if(Array.isArray(set.labels)) window.timerManager.labels = set.labels.slice();
			window.timerManager.saveToStorage();
			window.timerManager.updateUI();
			console.debug('Loaded saved timers for', tkey);
		});

		// delete today
		const tDel = document.getElementById('todayDelete');
		if(tDel) tDel.addEventListener('click', ()=>{
			const d = tkey;
			const all2 = loadAll();
			if(all2[d]){
				delete all2[d];
				saveAll(all2);
				render();
				if(tv) tv.textContent = '(empty)';
				console.debug('Deleted', d);
			}
		});

		// delegate load/save buttons in the list
		document.getElementById('savesList').addEventListener('click', (ev)=>{
			const t = ev.target;
			if(t.classList.contains('load-save')){
				const d = t.dataset.date;
				const all2 = loadAll();
				if(all2[d]){
					const set = all2[d];
					window.timerManager.timers = set.timers.map(n=>Number(n)||0);
					if(Array.isArray(set.labels)) window.timerManager.labels = set.labels.slice();
					window.timerManager.saveToStorage();
					window.timerManager.updateUI();
					console.debug('Loaded', d);
				}
			}
			if(t.classList.contains('save-save')){
				const d = t.dataset.date;
				const payload = {
					timers: window.timerManager.timers.map(v=>Math.floor(v)),
					labels: window.timerManager.labels.slice(),
					savedAt: Date.now()
				};
				const all2 = loadAll();
				all2[d] = payload;
				saveAll(all2);
				render();
				console.debug('Saved to', d);
			}
			if(t.classList.contains('delete-save')){
				const d = t.dataset.date;
				const all2 = loadAll();
				if(all2[d]){
					delete all2[d];
					saveAll(all2);
					render();
					console.debug('Deleted', d);
				}
			}
		});

		// export/import all saves
		const exp = document.getElementById('savesExport');
		const imp = document.getElementById('savesImport');
		if(exp) exp.addEventListener('click', ()=>{
			const all2 = loadAll();
			const blob = new Blob([JSON.stringify(all2,null,2)],{type:'application/json'});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a'); a.href = url; a.download = 'pelutimer-saves.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
		});
		if(imp) imp.addEventListener('click', ()=>{
			const txt = prompt('Paste saves JSON to import (will overwrite existing saves):');
			if(!txt) return;
			try{
				const parsed = JSON.parse(txt);
				if(typeof parsed === 'object'){
					saveAll(parsed);
					render();
					console.debug('Imported saves');
				}
			}catch(e){console.debug('Invalid JSON', e)}
		});
	}

	// expose a simple init for when the main app is ready
	function init(){
		render();
		wire();
	}

	// wait for DOMContent
	document.addEventListener('DOMContentLoaded', ()=>{
		// try to initialise after a short delay to allow main timer to attach to window
		setTimeout(()=>{
			if(window.timerManager) init(); else {
				// try again later
				const int = setInterval(()=>{ if(window.timerManager){ clearInterval(int); init() } },200);
			}
		},100);
	});

})();
