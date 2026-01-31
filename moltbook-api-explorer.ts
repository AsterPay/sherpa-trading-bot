/**
 * Moltbook API Explorer Agent
 * 
 * Tutkii Moltbook-ekosysteemin agentteja API:n kautta.
 * Hakee postauksia, profiileja, submoltteja ja analysoi agentteja.
 * 
 * Käyttö: 
 *   MOLTBOOK_API_KEY=moltbook_xxx npx ts-node moltbook-api-explorer.ts
 * 
 * API Docs: https://www.moltbook.com/skill.md
 */

import * as fs from 'fs';

// Konfiguraatio
const CONFIG = {
  API_BASE: 'https://www.moltbook.com/api/v1',
  API_KEY: process.env.MOLTBOOK_API_KEY || '',
  OUTPUT_FILE: './moltbook-api-report.md',
  SEARCH_QUERIES: [
    'AI agents and their capabilities',
    'payment infrastructure x402',
    'autonomous agents',
    'agent services and APIs',
  ],
};

// Tyypit
interface MoltbookAgent {
  name: string;
  description: string;
  karma: number;
  follower_count: number;
  following_count: number;
  is_claimed: boolean;
  is_active: boolean;
  created_at: string;
  last_active: string;
  avatar_url?: string;
  owner?: {
    x_handle: string;
    x_name: string;
    x_avatar?: string;
    x_bio?: string;
    x_follower_count?: number;
  };
}

interface MoltbookPost {
  id: string;
  title: string;
  content: string;
  url?: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  author: {
    name: string;
    avatar_url?: string;
  };
  submolt: {
    name: string;
    display_name: string;
  };
}

interface MoltbookSubmolt {
  name: string;
  display_name: string;
  description: string;
  subscriber_count: number;
  post_count: number;
  created_at: string;
  avatar_url?: string;
  banner_url?: string;
}

interface SearchResult {
  id: string;
  type: 'post' | 'comment';
  title?: string;
  content: string;
  upvotes: number;
  similarity: number;
  author: { name: string };
  submolt?: { name: string; display_name: string };
  post_id: string;
}

interface DiscoveredAgent {
  name: string;
  description?: string;
  karma?: number;
  posts: MoltbookPost[];
  searchMentions: number;
  topics: string[];
}

// API-kutsujen apufunktio
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CONFIG.API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Lisää API-avain jos saatavilla
  if (CONFIG.API_KEY) {
    headers['Authorization'] = `Bearer ${CONFIG.API_KEY}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data as T;
}

// Hae postaukset
async function getPosts(sort: 'hot' | 'new' | 'top' = 'hot', limit = 25): Promise<MoltbookPost[]> {
  console.log(`📰 Haetaan ${sort} postauksia (${limit} kpl)...`);
  
  try {
    const response = await apiCall<{ posts: MoltbookPost[] }>(
      `/posts?sort=${sort}&limit=${limit}`
    );
    return response.posts || [];
  } catch (error) {
    console.error('   Virhe postausten haussa:', error);
    return [];
  }
}

// Hae submoltit
async function getSubmolts(): Promise<MoltbookSubmolt[]> {
  console.log('🏘️ Haetaan submoltit...');
  
  try {
    const response = await apiCall<{ submolts: MoltbookSubmolt[] }>('/submolts');
    return response.submolts || [];
  } catch (error) {
    console.error('   Virhe submolttien haussa:', error);
    return [];
  }
}

// Semanttinen haku
async function search(query: string, type: 'all' | 'posts' | 'comments' = 'all', limit = 20): Promise<SearchResult[]> {
  console.log(`🔍 Haetaan: "${query}"...`);
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await apiCall<{ results: SearchResult[] }>(
      `/search?q=${encodedQuery}&type=${type}&limit=${limit}`
    );
    return response.results || [];
  } catch (error) {
    console.error('   Virhe haussa:', error);
    return [];
  }
}

// Hae agentin profiili
async function getAgentProfile(name: string): Promise<MoltbookAgent | null> {
  console.log(`👤 Haetaan profiili: ${name}...`);
  
  try {
    const response = await apiCall<{ agent: MoltbookAgent; recentPosts: MoltbookPost[] }>(
      `/agents/profile?name=${encodeURIComponent(name)}`
    );
    return response.agent || null;
  } catch (error) {
    console.error(`   Virhe profiilin haussa (${name}):`, error);
    return null;
  }
}

// Löydä uniikit agentit postauksista
function extractAgentsFromPosts(posts: MoltbookPost[]): Map<string, DiscoveredAgent> {
  const agents = new Map<string, DiscoveredAgent>();
  
  for (const post of posts) {
    const authorName = post.author.name;
    
    if (!agents.has(authorName)) {
      agents.set(authorName, {
        name: authorName,
        posts: [],
        searchMentions: 0,
        topics: [],
      });
    }
    
    const agent = agents.get(authorName)!;
    agent.posts.push(post);
    
    // Lisää aihe submoltista
    if (post.submolt?.name && !agent.topics.includes(post.submolt.name)) {
      agent.topics.push(post.submolt.name);
    }
  }
  
  return agents;
}

// Löydä agentit hakutuloksista
function extractAgentsFromSearch(results: SearchResult[], agents: Map<string, DiscoveredAgent>): void {
  for (const result of results) {
    const authorName = result.author.name;
    
    if (!agents.has(authorName)) {
      agents.set(authorName, {
        name: authorName,
        posts: [],
        searchMentions: 0,
        topics: [],
      });
    }
    
    const agent = agents.get(authorName)!;
    agent.searchMentions++;
    
    if (result.submolt?.name && !agent.topics.includes(result.submolt.name)) {
      agent.topics.push(result.submolt.name);
    }
  }
}

// Päätutkimusfunktio
async function exploreMoltbook(): Promise<{
  agents: DiscoveredAgent[];
  submolts: MoltbookSubmolt[];
  topPosts: MoltbookPost[];
  searchInsights: Map<string, SearchResult[]>;
}> {
  console.log('═══════════════════════════════════════════════════');
  console.log('🦞 Moltbook API Explorer Agent');
  console.log('═══════════════════════════════════════════════════\n');

  const discoveredAgents = new Map<string, DiscoveredAgent>();
  const searchInsights = new Map<string, SearchResult[]>();

  // 1. Hae hot postaukset
  console.log('\n📊 VAIHE 1: Haetaan suosituimmat postaukset\n');
  const hotPosts = await getPosts('hot', 50);
  extractAgentsFromPosts(hotPosts);
  
  // 2. Hae uusimmat postaukset
  console.log('\n📊 VAIHE 2: Haetaan uusimmat postaukset\n');
  const newPosts = await getPosts('new', 50);
  const allPosts = [...hotPosts, ...newPosts];
  
  // Poista duplikaatit
  const uniquePosts = Array.from(
    new Map(allPosts.map(p => [p.id, p])).values()
  );
  
  // Löydä agentit
  for (const post of uniquePosts) {
    const agents = extractAgentsFromPosts([post]);
    for (const [name, agent] of agents) {
      if (!discoveredAgents.has(name)) {
        discoveredAgents.set(name, agent);
      } else {
        const existing = discoveredAgents.get(name)!;
        existing.posts.push(...agent.posts);
        for (const topic of agent.topics) {
          if (!existing.topics.includes(topic)) {
            existing.topics.push(topic);
          }
        }
      }
    }
  }

  // 3. Hae submoltit
  console.log('\n📊 VAIHE 3: Haetaan yhteisöt (submoltit)\n');
  const submolts = await getSubmolts();
  console.log(`   Löytyi ${submolts.length} submolttia`);

  // 4. Semanttinen haku (vaatii API-avaimen, ohitetaan ilman sitä)
  console.log('\n📊 VAIHE 4: Semanttinen haku\n');
  
  if (CONFIG.API_KEY) {
    for (const query of CONFIG.SEARCH_QUERIES) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
      const results = await search(query, 'all', 15);
      searchInsights.set(query, results);
      extractAgentsFromSearch(results, discoveredAgents);
      console.log(`   "${query}" → ${results.length} tulosta`);
    }
  } else {
    console.log('   ⚠️ Haku ohitettu - vaatii API-avaimen');
    console.log('   Aseta MOLTBOOK_API_KEY ottaaksesi haun käyttöön');
  }

  // 5. Järjestä agentit (ohitetaan profiilihaut nopeuttaaksemme)
  console.log('\n📊 VAIHE 5: Analysoidaan löydetyt agentit\n');
  
  // Järjestä agentit aktiivisuuden mukaan
  const sortedAgents = Array.from(discoveredAgents.values())
    .sort((a, b) => (b.posts.length + b.searchMentions) - (a.posts.length + a.searchMentions))
    .slice(0, 20); // Top 20 agenttia
  
  console.log(`   Analysoitu ${sortedAgents.length} agenttia postauksista`);
  
  // Profiilihaun voi ottaa käyttöön lisäämällä MOLTBOOK_API_KEY ympäristömuuttujan
  // ja poistamalla alla olevan kommentin
  /*
  if (CONFIG.API_KEY) {
    for (const agent of sortedAgents.slice(0, 3)) {
      const profile = await getAgentProfile(agent.name);
      if (profile) {
        agent.description = profile.description;
        agent.karma = profile.karma;
      }
    }
  }
  */

  return {
    agents: sortedAgents,
    submolts,
    topPosts: uniquePosts.slice(0, 20),
    searchInsights,
  };
}

// Generoi raportti
function generateReport(data: {
  agents: DiscoveredAgent[];
  submolts: MoltbookSubmolt[];
  topPosts: MoltbookPost[];
  searchInsights: Map<string, SearchResult[]>;
}): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Moltbook Agentit - API Tutkimusraportti 🦞

> Generoitu: ${timestamp}
> API: https://www.moltbook.com/api/v1
> Löydetyt agentit: ${data.agents.length}
> Submoltit: ${data.submolts.length}

---

## Aktiivisimmat Agentit

| Agentti | Karma | Postauksia | Aiheet |
|---------|-------|------------|--------|
${data.agents.map(a => 
  `| **${a.name}** | ${a.karma || '-'} | ${a.posts.length} | ${a.topics.slice(0, 3).join(', ') || '-'} |`
).join('\n')}

---

## Agenttien Yksityiskohdat

`;

  for (const agent of data.agents) {
    report += `### ${agent.name}

${agent.description ? `**Kuvaus:** ${agent.description}` : ''}

- **Karma:** ${agent.karma || 'N/A'}
- **Postauksia löytyi:** ${agent.posts.length}
- **Hakuosumia:** ${agent.searchMentions}
- **Aktiivinen aiheissa:** ${agent.topics.join(', ') || 'Ei määritelty'}

`;

    if (agent.posts.length > 0) {
      report += `**Viimeisimmät postaukset:**
`;
      for (const post of agent.posts.slice(0, 3)) {
        report += `- "${post.title}" (⬆️${post.upvotes} 💬${post.comment_count}) - m/${post.submolt?.name || 'general'}
`;
      }
      report += '\n';
    }

    report += `---

`;
  }

  // Submoltit
  report += `## Yhteisöt (Submoltit)

| Submolt | Kuvaus | Tilaajat | Postauksia |
|---------|--------|----------|------------|
${data.submolts.map(s => 
  `| **m/${s.name}** | ${s.description?.substring(0, 50) || '-'}... | ${s.subscriber_count} | ${s.post_count} |`
).join('\n')}

---

## Suosituimmat Postaukset

`;

  for (const post of data.topPosts.slice(0, 10)) {
    report += `### "${post.title}"
- **Kirjoittaja:** ${post.author.name}
- **Submolt:** m/${post.submolt?.name || 'general'}
- **Äänet:** ⬆️${post.upvotes} ⬇️${post.downvotes}
- **Kommentit:** ${post.comment_count}

${post.content?.substring(0, 200)}${post.content?.length > 200 ? '...' : ''}

---

`;
  }

  // Hakutulokset
  report += `## Semanttisen Haun Tulokset

`;

  for (const [query, results] of data.searchInsights) {
    report += `### "${query}"

Löytyi ${results.length} osumaa:

`;
    for (const result of results.slice(0, 5)) {
      report += `- **${result.author.name}** (${result.type}): "${result.title || result.content.substring(0, 50)}..." (similarity: ${(result.similarity * 100).toFixed(0)}%)
`;
    }
    report += '\n';
  }

  // Moltbook-opas
  report += `---

## Moltbook API Pikaopas

### Rekisteröinti

\`\`\`bash
curl -X POST https://www.moltbook.com/api/v1/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "AgentName", "description": "What you do"}'
\`\`\`

### Postauksen luominen

\`\`\`bash
curl -X POST https://www.moltbook.com/api/v1/posts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"submolt": "general", "title": "Hello!", "content": "My post"}'
\`\`\`

### Semanttinen haku

\`\`\`bash
curl "https://www.moltbook.com/api/v1/search?q=AI+agents&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

### Rate Limits

- 100 requests/minute
- 1 post per 30 minutes
- 1 comment per 20 seconds
- 50 comments per day

---

*Raportti generoitu Moltbook API Explorer Agentilla*
*Lähde: https://www.moltbook.com/skill.md*
`;

  return report;
}

// Pääohjelma
async function main() {
  // Tarkista API-avain
  if (!CONFIG.API_KEY) {
    console.log('⚠️  MOLTBOOK_API_KEY ei ole asetettu');
    console.log('   Jotkut API-kutsut saattavat epäonnistua.\n');
    console.log('   Aseta: $env:MOLTBOOK_API_KEY="moltbook_xxx"\n');
  }

  try {
    // Tutki Moltbook
    const data = await exploreMoltbook();

    // Generoi raportti
    console.log('\n📝 Generoidaan raportti...\n');
    const report = generateReport(data);
    
    // Tallenna
    fs.writeFileSync(CONFIG.OUTPUT_FILE, report, 'utf-8');
    console.log(`✅ Raportti tallennettu: ${CONFIG.OUTPUT_FILE}`);

    // Yhteenveto
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 YHTEENVETO');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`🦞 Löydetyt agentit: ${data.agents.length}`);
    console.log(`🏘️  Submoltit: ${data.submolts.length}`);
    console.log(`📰 Postauksia analysoitu: ${data.topPosts.length}`);
    
    console.log('\n🔝 TOP 5 Aktiivisinta agenttia:');
    for (const agent of data.agents.slice(0, 5)) {
      console.log(`   • ${agent.name} (karma: ${agent.karma || '?'}, posts: ${agent.posts.length})`);
    }

    console.log('\n═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Virhe:', error);
    process.exit(1);
  }
}

// Aja
main();
