import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { calculateShiftProfit } from '../core/calculations.js';
import { getProfitabilityStatus } from '../core/traffic-light.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';
import { Validation } from '../utils/validation.js';

export const RecordsModule = {
  async submitRecord(formData) {
    const { vehicleId, date, mode, shift, revenueReal, distanceKm } = formData;

    const validation = Validation.validateWorkRecord({ vehicleId, date, revenueReal, distanceKm });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }

    const vehicles = await VehicleRepository.getAll();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Selecione um veículo cadastrado válido.');

    const existing = await RecordRepository.getByDateRange(date, date, vehicleId);

    if (mode === 'full_day' && existing.length > 0) {
      throw new Error('Conflito de data: já existem turnos lançados neste dia. Exclua os turnos existentes ou lance por turno.');
    }

    if (mode === 'shift') {
      if (existing.some(r => r.mode === 'full_day')) {
        throw new Error('Conflito de data: já existe um registro de Dia Completo nesta data. Exclua-o antes de lançar turnos.');
      }
      if (existing.some(r => r.shift === shift)) {
        throw new Error(`O turno "${shift}" já está registrado nesta data para este veículo.`);
      }
    }

    const revenueCents = Money.toCents(revenueReal);
    const snapshotCalculations = calculateShiftProfit({
      revenueCents,
      distanceKm: parseFloat(distanceKm),
      kmPerLiter: vehicle.kmPerLiter,
      fuelPriceCents: Money.toCents(vehicle.fuelPrice),
      maintCostPerKm: vehicle.maintCostPerKm,
      deprCostPerKm: vehicle.deprCostPerKm
    });

    const record = {
      vehicleId,
      date,
      mode,
      shift: mode === 'shift' ? shift : null,
      revenueCents,
      distanceKm: parseFloat(distanceKm),
      snapshot: {
        ...snapshotCalculations,
        vehicleModel: `${vehicle.brand} ${vehicle.model}`,
        kmPerLiter: vehicle.kmPerLiter,
        fuelPriceCents: Money.toCents(vehicle.fuelPrice),
        maintCostPerKm: vehicle.maintCostPerKm,
        deprCostPerKm: vehicle.deprCostPerKm
      }
    };

    return await RecordRepository.save(record);
  },

  async renderForm(container, onSuccess) {
    const vehicles = await VehicleRepository.getAll();
    if (!vehicles.length) {
      container.innerHTML = `
        <section class="surface stack-md">
          <span class="eyebrow">Pré-requisito</span>
          <h1 class="page-title">Cadastre um veículo primeiro</h1>
          <p class="text-muted">É necessário ter ao menos um veículo cadastrado para calcular os custos operacionais.</p>
          <div><a href="#/veiculos" class="btn btn-primary">Ir para Veículos</a></div>
        </section>
      `;
      return;
    }

    const activeVehicle = vehicles.find(v => v.active) || vehicles[0];

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="form-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">Entrada Operacional</span>
            <h1 id="form-heading" class="page-title">Lançar Trabalho</h1>
          </div>
          <a href="#/inicio" class="btn btn-secondary btn-sm">Cancelar</a>
        </div>

        <div id="form-feedback" class="notice notice-strong hidden" role="alert"></div>

        <form id="work-form" class="surface stack-md" novalidate>
          <div class="form-grid">
            <div class="form-group">
              <label for="w-vehicle">Veículo Utilizado</label>
              <select id="w-vehicle">
                ${vehicles.map(v => `<option value="${v.id}" ${v.id === activeVehicle.id ? 'selected' : ''}>${v.brand} ${v.model} (${v.kmPerLiter} km/l)</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="w-date">Data</label>
              <input type="date" id="w-date" value="${Dates.getTodayISO()}" required>
            </div>

            <div class="form-group">
              <label for="w-mode">Tipo de Registro</label>
              <select id="w-mode">
                <option value="full_day">Dia Completo</option>
                <option value="shift">Por Turno</option>
              </select>
            </div>

            <div class="form-group hidden" id="shift-group">
              <label for="w-shift">Turno</label>
              <select id="w-shift">
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>

            <div class="form-group">
              <label for="w-revenue">Faturamento Bruto (R$)</label>
              <input type="number" step="0.01" min="0" id="w-revenue" required placeholder="0,00">
            </div>

            <div class="form-group">
              <label for="w-km">Quilometragem Rodada (km)</label>
              <input type="number" step="0.1" min="0.1" id="w-km" required placeholder="0,0">
            </div>
          </div>

          <div id="live-preview" class="notice stack-sm" aria-live="polite">
            <span class="eyebrow">Prévia do Cálculo</span>
            <p class="text-muted">Preencha o faturamento bruto e a distância para visualizar a decomposição.</p>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Salvar Lançamento</button>
        </form>
      </section>
    `;

    const vehicleSelect = container.querySelector('#w-vehicle');
    const modeSelect = container.querySelector('#w-mode');
    const shiftGroup = container.querySelector('#shift-group');
    const revInput = container.querySelector('#w-revenue');
    const kmInput = container.querySelector('#w-km');
    const previewBox = container.querySelector('#live-preview');
    const feedbackBox = container.querySelector('#form-feedback');

    const updatePreview = () => {
      const v = vehicles.find(item => item.id === vehicleSelect.value);
      const rev = parseFloat(revInput.value);
      const km = parseFloat(kmInput.value);

      if (!v || isNaN(rev) || rev < 0 || isNaN(km) || km <= 0) {
        previewBox.innerHTML = `
          <span class="eyebrow">Prévia do Cálculo</span>
          <p class="text-muted">Informe faturamento (>= 0) e quilometragem (> 0) para simular.</p>
        `;
        return;
      }

      const calc = calculateShiftProfit({
        revenueCents: Money.toCents(rev),
        distanceKm: km,
        kmPerLiter: v.kmPerLiter,
        fuelPriceCents: Money.toCents(v.fuelPrice),
        maintCostPerKm: v.maintCostPerKm,
        deprCostPerKm: v.deprCostPerKm
      });

      const marginStr = calc.profitMargin !== null ? `${calc.profitMargin.toFixed(1)}%` : 'Indisponível';

      previewBox.innerHTML = `
        <div class="row-between">
          <span class="eyebrow">Prévia do Resultado</span>
          <span class="pill pill-outline">Margem: ${marginStr}</span>
        </div>
        <div class="ledger-list mt-2">
          <div class="ledger-row">
            <span class="text-muted">Combustível Estimado</span>
            <span class="ledger-amount">−${Money.format(calc.fuelCostCents)}</span>
          </div>
          <div class="ledger-row">
            <span class="text-muted">Reserva Manutenção</span>
            <span class="ledger-amount">−${Money.format(calc.maintReserveCents)}</span>
          </div>
          <div class="ledger-row">
            <span>Dinheiro Livre Estimado</span>
            <span class="ledger-amount text-strong">${Money.format(calc.availableMoneyCents)}</span>
          </div>
          <div class="ledger-row is-total">
            <span>Lucro Econômico Real</span>
            <span class="ledger-amount">${Money.format(calc.economicProfitCents)}</span>
          </div>
        </div>
      `;
    };

    modeSelect.addEventListener('change', () => {
      shiftGroup.classList.toggle('hidden', modeSelect.value !== 'shift');
    });

    [vehicleSelect, revInput, kmInput].forEach(el => el.addEventListener('input', updatePreview));

    container.querySelector('#work-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      feedbackBox.classList.add('hidden');
      try {
        await this.submitRecord({
          vehicleId: vehicleSelect.value,
          date: document.getElementById('w-date').value,
          mode: modeSelect.value,
          shift: document.getElementById('w-shift').value,
          revenueReal: parseFloat(revInput.value),
          distanceKm: parseFloat(kmInput.value)
        });
        onSuccess();
      } catch (err) {
        feedbackBox.textContent = err.message;
        feedbackBox.classList.remove('hidden');
      }
    });
  },

  async renderHistory(container, settings = {}) {
    const vehicles = await VehicleRepository.getAll();
    const allRecords = await RecordRepository.getByDateRange('1970-01-01', '2099-12-31');
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="hist-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">Livro-Razão Operacional</span>
            <h1 id="hist-heading" class="page-title">Histórico de Jornadas</h1>
          </div>
          <a href="#/novo" class="btn btn-primary">+ Novo Registro</a>
        </div>

        <div class="surface form-grid">
          <div class="form-group">
            <label for="hist-vehicle-filter">Veículo</label>
            <select id="hist-vehicle-filter">
              <option value="all">Todos os Veículos</option>
              ${vehicles.map(v => `<option value="${v.id}">${v.brand} ${v.model}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="snapshot-detail-area" class="hidden"></div>

        <div class="surface table-wrap" id="history-table-wrap"></div>
      </section>
    `;

    const tableWrap = container.querySelector('#history-table-wrap');
    const detailArea = container.querySelector('#snapshot-detail-area');
    const filterSelect = container.querySelector('#hist-vehicle-filter');

    const renderTable = (records) => {
      if (!records.length) {
        tableWrap.innerHTML = '<p class="text-muted">Nenhum registro encontrado para o filtro selecionado.</p>';
        return;
      }

      tableWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Turno</th>
              <th>Veículo</th>
              <th class="num text-right">Distância</th>
              <th class="num text-right">Bruto</th>
              <th class="num text-right">Livre</th>
              <th class="num text-right">Lucro Econômico</th>
              <th class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => {
              const status = getProfitabilityStatus(r.snapshot.profitMargin, r.snapshot.revenueCents, settings);
              const sign = r.snapshot.economicProfitCents > 0 ? '+' : '';
              return `
                <tr>
                  <td class="tabular">${Dates.formatBR(r.date)}</td>
                  <td>${r.mode === 'full_day' ? 'Dia Completo' : r.shift}</td>
                  <td>${r.snapshot.vehicleModel || 'Veículo'}</td>
                  <td class="num text-right">${r.distanceKm.toFixed(1)} km</td>
                  <td class="num text-right">${Money.format(r.snapshot.revenueCents)}</td>
                  <td class="num text-right">${Money.format(r.snapshot.availableMoneyCents)}</td>
                  <td class="num text-right">
                    <div class="text-strong">${sign}${Money.format(r.snapshot.economicProfitCents)}</div>
                    <div class="metric-note">${status.label}</div>
                  </td>
                  <td class="text-right">
                    <div class="row-wrap">
                      <button type="button" class="btn btn-secondary btn-sm" data-view="${r.id}">Snapshot</button>
                      <button type="button" class="btn btn-danger btn-sm" data-delete="${r.id}">Excluir</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      tableWrap.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
          const rec = records.find(item => item.id === btn.getAttribute('data-view'));
          if (!rec) return;
          detailArea.classList.remove('hidden');
          detailArea.innerHTML = `
            <article class="surface stack-sm" aria-label="Parâmetros preservados">
              <div class="row-between">
                <h2 class="section-title">Snapshot Preservado — ${Dates.formatBR(rec.date)} (${rec.mode === 'full_day' ? 'Dia Completo' : rec.shift})</h2>
                <button type="button" id="close-detail" class="btn btn-secondary btn-sm">Fechar</button>
              </div>
              <p class="metric-note">Parâmetros congelados no momento do registro (Fórmula v${rec.snapshot.formulaVersion || '1.0'}):</p>
              <div class="grid-12 mt-2">
                <div class="col-6-sm col-3"><span class="eyebrow">Consumo</span><div class="tabular mt-2">${rec.snapshot.kmPerLiter} km/l</div></div>
                <div class="col-6-sm col-3"><span class="eyebrow">Combustível</span><div class="tabular mt-2">${Money.format(rec.snapshot.fuelPriceCents)}/L</div></div>
                <div class="col-6-sm col-3"><span class="eyebrow">Manutenção</span><div class="tabular mt-2">R$ ${Number(rec.snapshot.maintCostPerKm).toFixed(2)}/km</div></div>
                <div class="col-6-sm col-3"><span class="eyebrow">Depreciação</span><div class="tabular mt-2">R$ ${Number(rec.snapshot.deprCostPerKm).toFixed(2)}/km</div></div>
              </div>
            </article>
          `;
          detailArea.querySelector('#close-detail').addEventListener('click', () => detailArea.classList.add('hidden'));
        });
      });

      tableWrap.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-delete');
          if (confirm('Confirmar exclusão definitiva deste registro?')) {
            await RecordRepository.delete(id);
            this.renderHistory(container, settings);
          }
        });
      });
    };

    filterSelect.addEventListener('change', () => {
      const val = filterSelect.value;
      const filtered = val === 'all' ? allRecords : allRecords.filter(r => r.vehicleId === val);
      renderTable(filtered);
    });

    renderTable(allRecords);
  }
};
