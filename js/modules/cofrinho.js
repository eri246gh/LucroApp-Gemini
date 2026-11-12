import { ReserveRepository } from '../database/repositories.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const CofrinhoModule = {
  async render(container) {
    const transactions = await ReserveRepository.getAllTransactions();
    const balanceCents = await ReserveRepository.getBalanceCents();

    const totalDepositedCents = transactions
      .filter(t => t.type === 'deposit' || (t.type === 'adjustment' && t.amountCents > 0))
      .reduce((acc, t) => acc + t.amountCents, 0);

    const totalWithdrawnCents = transactions
      .filter(t => t.type === 'withdrawal' || (t.type === 'adjustment' && t.amountCents < 0))
      .reduce((acc, t) => acc + Math.abs(t.amountCents), 0);

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="cofre-heading">
        <div class="page-header">
          <h1 id="cofre-heading" class="page-title">Cofrinho de Manutenção</h1>
        </div>

        <div class="alert-box alert-info">
          <strong>Importante:</strong> A reserva diária sugerida no painel não entra automaticamente aqui. Registre abaixo apenas o dinheiro efetivamente guardado ou utilizado.
        </div>

        <div class="grid-12">
          <div class="col-12 col-6">
            <article class="hero-card">
              <span class="hero-label">Saldo Real Guardado</span>
              <span class="hero-value ${balanceCents >= 0 ? 'positive' : 'negative'}">${Money.format(balanceCents)}</span>
              <span class="hero-meta">Calculado pelo histórico auditável de movimentações</span>
            </article>
          </div>
          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Total Depositado</span>
              <span class="kpi-value text-green">+${Money.format(totalDepositedCents)}</span>
            </article>
          </div>
          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Total Retirado</span>
              <span class="kpi-value text-red">-${Money.format(totalWithdrawnCents)}</span>
            </article>
          </div>
        </div>

        <div class="row-wrap">
          <button type="button" id="btn-deposit" class="btn btn-primary">+ Registrar Depósito</button>
          <button type="button" id="btn-withdraw" class="btn btn-danger">− Registrar Retirada</button>
        </div>

        <div id="tx-form-container" class="hidden"></div>

        <div class="card table-wrap">
          <h2 class="page-title">Movimentações</h2>
          ${transactions.length === 0 ? '<p class="text-muted mt-2">Nenhuma movimentação registrada ainda.</p>' : `
            <table class="mt-2">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Observação</th>
                  <th class="num text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => `
                  <tr>
                    <td>${Dates.formatBR(t.date)}</td>
                    <td>
                      <span class="badge ${t.type === 'deposit' ? 'badge-success' : 'badge-danger'}">
                        ${t.type === 'deposit' ? 'Depósito' : 'Retirada'}
                      </span>
                    </td>
                    <td>${t.description || '—'}</td>
                    <td class="num text-right ${t.type === 'deposit' ? 'text-green' : 'text-red'}">
                      <strong>${t.type === 'deposit' ? '+' : '−'}${Money.format(t.amountCents)}</strong>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </section>
    `;

    const formContainer = container.querySelector('#tx-form-container');
    container.querySelector('#btn-deposit').addEventListener('click', () => this.renderForm(formContainer, 'deposit', balanceCents, container));
    container.querySelector('#btn-withdraw').addEventListener('click', () => this.renderForm(formContainer, 'withdrawal', balanceCents, container));
  },

  renderForm(formContainer, type, currentBalanceCents, rootContainer) {
    const isDeposit = type === 'deposit';
    formContainer.classList.remove('hidden');
    formContainer.innerHTML = `
      <form id="cofrinho-form" class="card stack-md" novalidate>
        <h3>${isDeposit ? 'Guardar Dinheiro no Cofrinho' : 'Retirar Dinheiro para Manutenção'}</h3>
        <div id="cofre-error" class="alert-box alert-error hidden" role="alert"></div>
        <div class="form-grid">
          <div class="form-group">
            <label for="tx-amount">Valor (R$)</label>
            <input type="number" step="0.01" min="0.01" id="tx-amount" required placeholder="Ex: 50.00">
          </div>
          <div class="form-group">
            <label for="tx-date">Data</label>
            <input type="date" id="tx-date" value="${Dates.getTodayISO()}" required>
          </div>
          <div class="form-group">
            <label for="tx-desc">Observação / Justificativa</label>
            <input type="text" id="tx-desc" placeholder="${isDeposit ? 'Ex: Reserva da semana' : 'Ex: Troca de óleo e filtro'}">
          </div>
        </div>
        <div class="row-wrap">
          <button type="submit" class="btn btn-primary">Confirmar Operação</button>
          <button type="button" id="btn-cancel-tx" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    formContainer.querySelector('#btn-cancel-tx').addEventListener('click', () => formContainer.classList.add('hidden'));

    formContainer.querySelector('#cofrinho-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = formContainer.querySelector('#cofre-error');
      errBox.classList.add('hidden');

      const amountReal = parseFloat(document.getElementById('tx-amount').value);
      const amountCents = Money.toCents(amountReal);

      if (isNaN(amountCents) || amountCents <= 0) {
        errBox.textContent = 'Informe um valor maior que R$ 0,00.';
        errBox.classList.remove('hidden');
        return;
      }

      if (!isDeposit && amountCents > currentBalanceCents) {
        errBox.textContent = `Saldo insuficiente. O valor máximo disponível para retirada é ${Money.format(currentBalanceCents)}.`;
        errBox.classList.remove('hidden');
        return;
      }

      await ReserveRepository.addTransaction({
        type,
        amountCents,
        date: document.getElementById('tx-date').value,
        description: document.getElementById('tx-desc').value.trim()
      });

      this.render(rootContainer);
    });
  }
};
