const cards = document.querySelectorAll('.interactive-card');
const inviteCode = 'TZqFmdJtBF';
const guildWidgetUrl = 'https://discord.com/api/guilds/1438452459818451028/widget.json';
const customStatusEndpoint = document.body?.dataset.statusEndpoint?.trim();
const membersNode = document.querySelector('[data-stat="members"]');
const onlineNode = document.querySelector('[data-stat="online"]');
const playingNode = document.querySelector('[data-stat="playing"]');
const activeGamesNode = document.querySelector('[data-active-games]');

cards.forEach((card) => {
  const updateGlow = (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    card.style.setProperty('--pointer-x', `${x}px`);
    card.style.setProperty('--pointer-y', `${y}px`);
  };

  card.addEventListener('mousemove', updateGlow);
  card.addEventListener('mouseenter', () => card.classList.add('is-active'));
  card.addEventListener('mouseleave', () => card.classList.remove('is-active'));
  card.addEventListener('focus', () => card.classList.add('is-active'));
  card.addEventListener('blur', () => card.classList.remove('is-active'));
});

const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(value);

const renderValue = (node, value) => {
  if (!node) {
    return;
  }

  node.textContent = Number.isFinite(value) ? formatNumber(value) : '—';
};

const renderGames = (games) => {
  if (!activeGamesNode) {
    return;
  }

  if (!games.length) {
    activeGamesNode.textContent = 'Сейчас никто не запустил игру — можно стать первым.';
    return;
  }

  activeGamesNode.innerHTML = games
    .map(
      ([name, count]) =>
        `<span class="status-chip"><span>${name}</span><span class="status-chip__count">${count}</span></span>`
    )
    .join('');
};

const normalizeGames = (games) => {
  if (!Array.isArray(games)) {
    return [];
  }

  return games
    .map((entry) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        return [String(entry[0]), Number(entry[1]) || 0];
      }

      if (entry && typeof entry === 'object') {
        return [String(entry.name ?? ''), Number(entry.count) || 0];
      }

      return ['', 0];
    })
    .filter(([name, count]) => name && count > 0);
};

const fetchCustomStatus = async () => {
  if (!customStatusEndpoint) {
    return null;
  }

  const response = await fetch(customStatusEndpoint, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error('Не удалось получить данные из внешнего webhook-bridge endpoint.');
  }

  const data = await response.json();

  return {
    members: Number(data.members),
    online: Number(data.online),
    playing: Number(data.playing),
    games: normalizeGames(data.games),
  };
};

const fetchDiscordStatus = async () => {
  const [inviteResponse, widgetResponse] = await Promise.all([
    fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true&with_expiration=true`),
    fetch(guildWidgetUrl),
  ]);

  if (!inviteResponse.ok) {
    throw new Error('Не удалось получить invite-статистику Discord.');
  }

  const inviteData = await inviteResponse.json();
  const widgetData = widgetResponse.ok ? await widgetResponse.json() : { members: [] };

  const members = inviteData?.profile?.member_count ?? inviteData?.approximate_member_count;
  const online = inviteData?.profile?.online_count ?? inviteData?.approximate_presence_count;
  const activeMembers = Array.isArray(widgetData?.members)
    ? widgetData.members.filter((member) => member.game?.name && !member.game.name.startsWith('/'))
    : [];

  const gameCountMap = activeMembers.reduce((accumulator, member) => {
    const gameName = member.game.name.trim();
    accumulator.set(gameName, (accumulator.get(gameName) ?? 0) + 1);
    return accumulator;
  }, new Map());

  return {
    members,
    online,
    playing: activeMembers.length,
    games: [...gameCountMap.entries()].sort((left, right) => right[1] - left[1]),
  };
};

const fetchServerStatus = async () => {
  try {
    const status = (await fetchCustomStatus()) ?? (await fetchDiscordStatus());

    renderValue(membersNode, status.members);
    renderValue(onlineNode, status.online);
    renderValue(playingNode, status.playing);
    renderGames(status.games);
  } catch (error) {
    console.error(error);
    renderGames([]);
  }
};

fetchServerStatus();
window.setInterval(fetchServerStatus, 60000);
