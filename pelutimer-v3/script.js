// Pelutimer v3 - object oriented timer manager
(function () {
	'use strict';

	// Utility: format seconds to HH:MM:SS
	function formatHHMMSS(totalSec) {
		const sec = Math.floor(totalSec % 60);
		const min = Math.floor((totalSec / 60) % 60);
		const hrs = Math.floor(totalSec / 3600);
		const pad = (n) => String(n).padStart(2, '0');
		return `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
	}

	// format a difference in seconds into a human-readable string
	function formatDifference(totalSec) {
		const s = Math.floor(totalSec || 0);
		const hrs = Math.floor(s / 3600);
		const mins = Math.floor((s % 3600) / 60);
		const secs = s % 60;
		const parts = [];
		if (hrs > 0) parts.push(`${hrs} hour${hrs > 1 ? 's' : ''}`);
		if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
		parts.push(`${secs} second${secs > 1 ? 's' : ''}`);
		return parts.join(', ');
	}

	// localStorage helpers (prefer localStorage for persistent, no-expiry storage)
	function storageSet(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch (e) {
			console.warn('Failed to write to localStorage', e);
		}
	}
	function storageGet(key) {
		try {
			return localStorage.getItem(key);
		} catch (e) {
			console.warn('Failed to read from localStorage', e);
			return null;
		}
	}

	class TimerManager {
		constructor(opts = {}) {
			// four timers in seconds
			this.timers = opts.timers || [0, 0, 0, 0];
			this.active = 0; // index of active color/timer
			this.lastTick = Date.now();
			this.tickInterval = null;
			this.saveCounter = 0; // count seconds until next save (every 10s)
			this.saveIntervalSeconds = 10;
			this.storageKey = opts.storageKey || 'pelutimer_v3_timers';

			// per-timer labels (order matches color indices: 0=blue,1=red,2=yellow,3=green)
			this.labels = opts.labels || ['Blue', 'Red', 'Yellow', 'Green'];

			this.paused = false;
			this.prevActive = null; // store previously active index when pausing

			// UI nodes
			// #timeField is the colored card container; .time-value inside it holds the numeric time
			this.timeCard = document.getElementById('timeField');
			this.timeField = this.timeCard ? this.timeCard.querySelector('.time-value') : null;
			this.appEl = document.getElementById('app');
			this.legendEls = [
				document.getElementById('val0'),
				document.getElementById('val1'),
				document.getElementById('val2'),
				document.getElementById('val3'),
			];

			this.loadFromStorage();
			// find timerLabel DOM node (it's inside the time card)
			this.timerLabelEl = this.timeCard ? this.timeCard.querySelector('#timerLabel') : document.getElementById('timerLabel');
			this.ratioRows = Array.from(document.querySelectorAll('.ratio-row'));
			this.editing = false; // whether the active timer is in edit mode
			this.editInput = null;
			this.updateUI();
			this.attachControls();
			this.attachLabelRenames();
			this.start();
		}

		attachControls() {
			this.buttons = Array.from(document.querySelectorAll('.color-btn'));
			this.buttons.forEach((btn) => {
				btn.addEventListener('click', (e) => {
					const idx = Number(btn.dataset.index);
					this.setActive(idx);
				});
				btn.setAttribute('aria-pressed', 'false');
			});
			this._syncButtonStates();

			// reset buttons
			const resets = Array.from(document.querySelectorAll('.reset-btn'));
			resets.forEach((r) => r.addEventListener('click', (e) => {
				const i = Number(r.dataset.index);
				this.resetTimer(i);
			}));

			// action buttons: pause, export, import
			const pauseBtn = document.getElementById('pauseBtn');
			const exportBtn = document.getElementById('exportBtn');
			const importBtn = document.getElementById('importBtn');
			const editTimeBtn = document.getElementById('editTimeBtn');
			const editLabelsBtn = document.getElementById('editLabelsBtn');
			if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
			if (exportBtn) exportBtn.addEventListener('click', () => this.exportTimers());
			if (importBtn) importBtn.addEventListener('click', () => this.importTimers());
			if (editLabelsBtn) editLabelsBtn.addEventListener('click', () => this.openLabelsModal());
			if (editTimeBtn) {
				// use mousedown to handle mouse interaction before the input blur occurs
				editTimeBtn.addEventListener('mousedown', (e) => {
					e.preventDefault();
					this.toggleEditMode();
				});
				// keyboard: support Enter/Space to toggle
				editTimeBtn.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						this.toggleEditMode();
					}
				});
			}

			// keyboard shortcuts: 1-4 select color, Space toggles pause/resume
			window.addEventListener('keydown', (ev) => {
				// Won't trigger if editing timer value.
				if (ev.key >= '1' && ev.key <= '4' && this.editing === false) {
					const idx = Number(ev.key) - 1;
					this.setActive(idx);
				} else if (ev.code === 'Space') {
					ev.preventDefault();
					this.togglePause();
				}
			});
			// no modal - labels edited inline directly
		}

		setActive(idx) {
			if (idx === this.active) return;
			this.active = idx;
			// update container class for background
			// color order: 0=blue,1=red,2=yellow,3=green (swapped positions)
			const colors = ['blue', 'red', 'yellow', 'green'];
			document.getElementById('app').className = `app bg-${colors[idx]}`;
			// update buttons active state / aria
			this._syncButtonStates();
			// Force UI update so displayed time updates immediately
			this.updateUI();
		}

		_syncButtonStates() {
			if (!this.buttons) return;
			this.buttons.forEach((b) => {
				const i = Number(b.dataset.index);
				if (i === this.active) {
					b.classList.add('active');
					b.setAttribute('aria-pressed', 'true');
				} else {
					b.classList.remove('active');
					b.setAttribute('aria-pressed', 'false');
				}
			});
		}

		_updateLabelUI() {
			if (this.timerLabelEl) {
				const newText = this.labels[this.active] || '';
				if (this.timerLabelEl.textContent !== newText) {
					// animate out then set text and animate back in
					this.timerLabelEl.classList.add('change-anim');
					setTimeout(() => {
						this.timerLabelEl.textContent = newText;
						this.timerLabelEl.classList.remove('change-anim');
					}, 180);
				}
			}
		}

		start() {
			if (this.tickInterval) return;
			this.lastTick = Date.now();
			this.tickInterval = setInterval(() => this._tick(), 1000);
			// also run one immediate tick to normalize
			// (but don't advance because lastTick just set)
			this.updateUI();
		}

		stop() {
			if (this.tickInterval) {
				clearInterval(this.tickInterval);
				this.tickInterval = null;
			}
		}

		_tick() {
			if (this.paused || this.editing) {
				// still update lastTick to avoid large deltas when resumed
				this.lastTick = Date.now();
				return;
			}

			const now = Date.now();
			const deltaMs = now - this.lastTick;
			if (deltaMs > 0) {
				const deltaSec = deltaMs / 1000;
				this.timers[this.active] += deltaSec;
			}
			this.lastTick = now;

			this.saveCounter += 1;
			if (this.saveCounter >= this.saveIntervalSeconds) {
				this.saveCounter = 0;
				this.saveToStorage();
			}

			this.updateUI();
		}

		updateUI() {
			// If paused, show PAUSED text and do not attempt to read an active timer
			if (this.paused) {
				if (this.timeField) this.timeField.textContent = 'PAUSED';
				if (this.timerLabelEl) this.timerLabelEl.textContent = 'PAUSED';
				// still update legend values so they reflect current timers
				this.legendEls.forEach((el, i) => {
					el.textContent = formatHHMMSS(this.timers[i]);
				});
				// hide ratio legend while paused
				if (this.ratioRows && this.ratioRows.length) {
					const root = document.getElementById('ratioLegend');
					if (root) root.classList.add('hidden');
				}
				return;
			}
			// ensure ratio legend visible when not paused
			if (this.ratioRows && this.ratioRows.length) {
				const root = document.getElementById('ratioLegend');
				if (root) root.classList.remove('hidden');
			}

			// update big display with active timer formatted (but don't overwrite while editing)
			if (!this.editing) this.timeField.textContent = formatHHMMSS(this.timers[this.active]);
			this._updateLabelUI();
			// update legends for all timers
			this.legendEls.forEach((el, i) => {
				el.textContent = formatHHMMSS(this.timers[i]);
			});

			// update ratio legend (show others compared to active). Hide active row.
			if (this.ratioRows && this.ratioRows.length) {
				const activeVal = this.timers[this.active] || 0;
				this.ratioRows.forEach((row) => {
					const idx = Number(row.dataset.index);
					const labelEl = row.querySelector('.ratio-label');
					const valEl = row.querySelector('.ratio-value');
					const timeEl = row.querySelector('.ratio-time');
					if (idx === this.active) {
						row.classList.add('hidden');
						return;
					} else {
						row.classList.remove('hidden');
					}
					const other = this.timers[idx] || 0;
					// ensure label matches current per-timer labels
					if (labelEl) labelEl.textContent = this.labels[idx] || labelEl.textContent;
					// decimal multiplier (other / active) formatted as e.g. 2.3x
						// multiplier
						if (activeVal > 0) {
							const mult = (other / activeVal);
								const txt = mult >= 10 ? Math.round(mult) + 'x' : (Math.round(mult * 10) / 10).toFixed(1) + 'x';
								valEl.textContent = txt;
								// set color class based on whether multiplier is >1, <1, or equal
								valEl.classList.remove('ratio-up', 'ratio-down', 'ratio-equal');
								if (mult > 1.0001) {
									valEl.classList.add('ratio-up');
								} else if (mult < 0.9999) {
									valEl.classList.add('ratio-down');
								} else {
									valEl.classList.add('ratio-equal');
								}
						} else {
							valEl.textContent = '—';
								valEl.classList.remove('ratio-up', 'ratio-down', 'ratio-equal');
						}
							// difference column intentionally left blank per recent update (hidden by CSS)
				});
			}
			// update legend label DOM text (if present)
			const labelEls = Array.from(document.querySelectorAll('.legend-label'));
			labelEls.forEach((le) => {
				// do not overwrite labels that are currently being edited (contain the inline input)
				if ((le.classList && le.classList.contains('editing')) || le.querySelector('input')) return;
				const idx = Number(le.dataset.index);
				if (!Number.isNaN(idx) && this.labels[idx]) le.textContent = this.labels[idx];
			});
		}

		saveToStorage() {
			try {
				const payload = JSON.stringify({ timers: this.timers.map(v => Math.floor(v)), labels: this.labels });
				storageSet(this.storageKey, payload);
				storageSet(this.storageKey + '_active', String(this.active));
			} catch (e) {
				console.warn('Failed saving timers to storage', e);
			}
		}

		exportTimers() {
			const payload = JSON.stringify({ timers: this.timers.map(v => Math.floor(v)), active: this.active, labels: this.labels }, null, 2);
			// create a blob and trigger download
			const blob = new Blob([payload], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'pelutimer-export.json';
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 5000);
		}

		importTimers() {
			const txt = prompt('Paste JSON export to import (timers array & optional active index):');
			if (!txt) return;
			try {
				const parsed = JSON.parse(txt);
				if (Array.isArray(parsed)) {
					if (parsed.length === 4) this.timers = parsed.map(n => Number(n) || 0);
				} else if (parsed && Array.isArray(parsed.timers) && parsed.timers.length === 4) {
					this.timers = parsed.timers.map(n => Number(n) || 0);
					if (Array.isArray(parsed.labels) && parsed.labels.length === 4) this.labels = parsed.labels.map(String);
					if (typeof parsed.active === 'number' && parsed.active >= 0 && parsed.active < 4) this.active = parsed.active;
				} else {
					alert('Invalid import format');
					return;
				}
				this.saveToStorage();
				this.updateUI();
				this._syncButtonStates();
			} catch (e) {
				alert('Invalid JSON');
			}
		}

		togglePause() {
			// Toggle paused state. When pausing, remember the active timer and
			// clear selection; when resuming, restore the previous active timer.
			this.paused = !this.paused;
			const btn = document.getElementById('pauseBtn');
			if (btn) {
				btn.setAttribute('aria-pressed', String(this.paused));
				btn.textContent = this.paused ? 'Resume' : 'Pause';
			}

			if (this.paused) {
				// entering paused: remember active then clear selection
				this.prevActive = this.active;
				this.active = -1; // no active timer
				this._syncButtonStates();
				if (this.timeCard) this.timeCard.classList.add('paused');
			} else {
				// resuming: restore previous active (or default to 0)
				this.active = (Number.isInteger(this.prevActive) ? this.prevActive : 0);
				this.prevActive = null;
				this._syncButtonStates();
				if (this.timeCard) this.timeCard.classList.remove('paused');
			}

			// ensure lastTick is fresh when resuming to avoid jump
			this.lastTick = Date.now();
			// update UI immediately to show PAUSED or restore time
			this.updateUI();
		}

		loadFromStorage() {
			try {
				const raw = storageGet(this.storageKey);
				if (raw) {
					const parsed = JSON.parse(raw);
					if (parsed && Array.isArray(parsed.timers) && parsed.timers.length === 4) {
						this.timers = parsed.timers.map(n => Number(n) || 0);
					}
					if (parsed && Array.isArray(parsed.labels) && parsed.labels.length === 4) {
						this.labels = parsed.labels.map(String);
					}
				}
				const activeRaw = storageGet(this.storageKey + '_active');
				if (activeRaw) {
					const a = Number(activeRaw);
					if (!Number.isNaN(a) && a >= 0 && a < 4) this.active = a;
				}
				// apply background class (swapped order: yellow at index 2)
				const colors = ['blue', 'red', 'yellow', 'green'];
				document.getElementById('app').className = `app bg-${colors[this.active]}`;
			} catch (e) {
				console.warn('Failed loading timers from storage', e);
			}
		}

		// allow clicking legend label to rename timer
		attachLabelRenames() {
			const labels = Array.from(document.querySelectorAll('.legend-label'));
			labels.forEach((el) => {
				const idx = Number(el.dataset.index);
				if (Number.isNaN(idx)) return;
				el.style.cursor = 'pointer';
				// single click => inline live edit (type to update label immediately)
				el.addEventListener('click', () => {
					// create inline input
					if (el.classList.contains('editing')) return; // already editing
					const cur = this.labels[idx] || `Timer ${idx+1}`;
					const input = document.createElement('input');
					input.type = 'text';
					input.value = cur;
					input.className = 'inline-edit';
					el.classList.add('editing');
					el.textContent = '';
					el.appendChild(input);
					input.focus();
					input.select();
					// live update as user types
					input.addEventListener('input', () => {
						this.labels[idx] = input.value;
						this._updateLabelUI();
					});
					const finish = () => {
						const nv = input.value.trim() || cur;
						this.labels[idx] = nv;
						this.saveToStorage();
						el.classList.remove('editing');
						el.textContent = nv;
						this._updateLabelUI();
					};
					input.addEventListener('blur', finish);
					input.addEventListener('keydown', (ev) => {
						if (ev.key === 'Enter') finish();
						if (ev.key === 'Escape') {
							el.classList.remove('editing');
							el.textContent = cur;
						}
					});
				});
			});
		}

		// toggle editing the active timer value
		toggleEditMode(){
			if(this.editing){
				this.exitEditMode(true);
			}else{
				this.enterEditMode();
			}
		}

		enterEditMode(){
			if(this.editing) return;
			this.editing = true;
			// create input inside the timeField to match style
			if(!this.timeField) return;
			const cur = formatHHMMSS(this.timers[this.active]);
			const input = document.createElement('input');
			input.type = 'text';
			input.value = cur;
			input.className = 'time-input';
			this.editInput = input;
			this.timeField.textContent = '';
			this.timeField.appendChild(input);
			input.focus();
			input.select();
			// stop ticking by marking editing; tick loop already checks this.editing
			// handle finish on blur or Enter/Escape
			const finish = (save)=>{
				this.exitEditMode(save);
			};
			input.addEventListener('blur', ()=> finish(true));
			input.addEventListener('keydown', (ev)=>{
				if(ev.key === 'Enter') finish(true);
				if(ev.key === 'Escape') finish(false);
			});
		}

		exitEditMode(save){
			if(!this.editing) return;
			const input = this.editInput;
			this.editInput = null;
			if(save && input){
				const parsed = this.parseTimeInput(input.value);
				if(parsed !== null){
					this.timers[this.active] = parsed;
					this.saveToStorage();
				}
			}
			this.editing = false;
			// restore display
			if(this.timeField){
				this.timeField.textContent = formatHHMMSS(this.timers[this.active]);
			}
		}

		// parse strings like HH:MM:SS or MM:SS or seconds numeric
		parseTimeInput(str){
			if(!str) return null;
			str = str.trim();
			// accept simple numeric seconds
			if(/^\d+$/.test(str)) return Number(str);
			const parts = str.split(':').map(p=>p.trim());
			if(parts.length === 0) return null;
			// allow mm:ss or hh:mm:ss
			if(parts.length === 2){
				const m = Number(parts[0]);
				const s = Number(parts[1]);
				if(Number.isFinite(m) && Number.isFinite(s)) return m*60 + s;
			}
			if(parts.length === 3){
				const h = Number(parts[0]);
				const m = Number(parts[1]);
				const s = Number(parts[2]);
				if(Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(s)) return h*3600 + m*60 + s;
			}
			return null;
		}



		resetTimer(i) {
			if (i < 0 || i > 3) return;
			this.timers[i] = 0;
			this.saveToStorage();
			this.updateUI();
		}
	}

	// instantiate on DOM ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => { window.timerManager = new TimerManager(); });
	} else {
		window.timerManager = new TimerManager();
	}

})();

