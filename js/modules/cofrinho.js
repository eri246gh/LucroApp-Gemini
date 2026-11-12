import { ReserveRepository } from '../database/repositories.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const CofrinhoModule = {
  async render(container) {
    const transactions = await ReserveRepository.getAllTransactions();
    const balanceCents = await ReserveRepository.getBalanceCents();

    container.innerHTML = `
      <section class="cofrinho-section">
        <div class="card balance-card">
          <span class="card-subtitle">Saldo Real Efetivo</span>
          <h2 class="balance-title ${balanceCents >= 0 ? 'text-green' : 'text-red'}">
            ${Money.format(balanceCents)}
          </h2>
          <p class="card-desc">Este é o dinheiro guardado fisicamente para futuras manutenções.</p>
        </div>

        <div class="action-buttons-grid">
          <button id="btn-deposit" class="btn btn-green">➕ Guardar Dinheiro</button>
          <button id="btn-withdraw" class="btn btn-red">➖ Retirar Dinheiro</button>
        </div>

        <div id="tx-form-container" class="form-drawer hidden"></div>

        <div class="history-section">
          <h3>Histórico de Movimentações</h3>
          ${transactions.length === 0 ? '<p class="empty-text">Nenhuma movimentação registrada.</p>' : ''}
          <ul class="transaction-list">
            ${transactions.map(t => `
              <li class="transaction-item">
                <div class="tx-info">
                  <span class="tx-type ${t.type}">
                    ${t.type === 'deposit' ? 'Depósito' : t.type === 'withdrawal' ? 'Retirada' : 'Ajuste'}
                  </span>
                  <span class="tx-date">${Dates.formatBR(t.date)}</span>
                  ${t.description ? `<span class="tx-desc">${t.description}</span>` : ''}
                </div>
                <span class="tx-amount ${t.type === 'deposit' ? 'text-green' : 'text-red'}">
                  ${t.type === 'deposit' ? '+' : '-'}${Money.format(t.amountCents)}
                </span>
              </li>
            `).join('')}
          </ul>
        </div>
      </section>
    `;

    this.bindEvents(container, balanceCents);
  },

  bindEvents(container, currentBalanceCents) {
    const formContainer = container.querySelector('#tx-form-container');

    container.querySelector('#btn-deposit')?.addEventListener('click', () => {
      this.renderForm(formContainer, 'deposit', currentBalanceCents);
    });

    container.querySelector('#btn-withdraw')?.addEventListener('click', () => {
      this.renderForm(formContainer, 'withdrawal', currentBalanceCents);
    });
  },

  renderForm(container, type, currentBalanceCents) {
    const isDeposit = type === 'deposit';
    container.classList.remove('hidden');
    container.innerHTML = `
      <form id="cofrinho-form" class="card form-card">
        <h4>${isDeposit ? 'Registrar Depósito' : 'Registrar Retirada'}</h4>
        <div class="form-group">
          <label>Valor (R$)</label>
          <input type="number" step="0.01" id="tx-amount" required min="0.01">
        </div>
        <div class="form-group">
          <label>Data</label>
          <input type="date" id="tx-date" value="${Dates.getTodayISO()}" required>
        </div>
        <div class="form-group">
          <label>Observação / Justificativa</label>
          <input type="text" id="tx-desc" placeholder="${isDeposit ? 'Ex: Depósito Semanal' : 'Ex: Troca de Óleo'}">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Confirmar</button>
          <button type="button" id="btn-cancel-tx" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    container.querySelector('#btn-cancel-tx').addEventListener('click', () => {
      container.classList.add('hidden');
    });

    container.querySelector('#cofrinho-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const amountReal = parseFloat(document.getElementById('tx-amount').value);
      const amountCents = Money.toCents(amountReal);

      if (!isDeposit && amountCents > currentBalanceCents) {
        alert('Erro: A retirada não pode ser superior ao saldo disponível no Cofrinho.');
        return;
      }

      await ReserveRepository.addTransaction({
        type,
        amountCents,
        date: document.getElementById('tx-date').value,
        description: document.getElementById('tx-desc').value.trim()
      });

      window.location.reload();
    });
  }
};
