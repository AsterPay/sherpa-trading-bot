/**
 * Moltbook Explorer Agent
 * 
 * Tutkii ja raportoi Moltbook-ekosysteemin agenteista.
 * Etsii agenttitiedostoja, parsii niiden kyvykkyydet ja tuottaa raportin.
 * 
 * Käyttö: npx ts-node moltbook-explorer-agent.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Konfiguraatio
const CONFIG = {
  SEARCH_PATHS: [
    'c:/cursor/2026/payment layer',
    'c:/cursor/2026',
  ],
  SKILL_FILE_PATTERNS: ['skill.md', 'moltbook-skill.md', 'SKILL.md'],
  AGENT_FILE_PATTERNS: ['*agent*.ts', '*agent*.js', 'autonomous-agent.ts'],
  README_PATTERNS: ['README.md', 'readme.md'],
  OUTPUT_FILE: './moltbook-agents-report.md',
};

// Agentin tiedot
interface AgentInfo {
  name: string;
  path: string;
  description: string;
  category: string;
  capabilities: string[];
  endpoints: string[];
  paymentInfo?: {
    protocol: string;
    currency: string;
    amount?: string;
    network?: string;
  };
  skillFile?: string;
  codeFile?: string;
  readmeFile?: string;
}

// Parsii skill.md tiedoston
function parseSkillFile(content: string, filePath: string): Partial<AgentInfo> {
  const info: Partial<AgentInfo> = {
    skillFile: filePath,
    capabilities: [],
    endpoints: [],
  };

  // Parsii YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    if (nameMatch) info.name = nameMatch[1].trim();
    
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    if (descMatch) info.description = descMatch[1].trim();

    const metadataMatch = frontmatter.match(/metadata:\s*(\{.*\})/);
    if (metadataMatch) {
      try {
        const metadata = JSON.parse(metadataMatch[1]);
        if (metadata.moltbot?.category) {
          info.category = metadata.moltbot.category;
        }
        if (metadata.moltbot?.api_base) {
          info.endpoints = [metadata.moltbot.api_base];
        }
      } catch (e) {
        // JSON parse error, skip
      }
    }
  }

  // Etsii otsikosta nimen jos ei frontmatterissa
  if (!info.name) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) info.name = titleMatch[1].trim();
  }

  // Etsii API endpointit
  const endpointMatches = content.matchAll(/`(https?:\/\/[^`]+)`/g);
  for (const match of endpointMatches) {
    if (!info.endpoints!.includes(match[1])) {
      info.endpoints!.push(match[1]);
    }
  }

  // Etsii kyvykkyydet (bulletit "What it does" tai "What This Skill Does" jälkeen)
  const capabilitiesMatch = content.match(/##\s*What.*Does[\s\S]*?(?=##|$)/i);
  if (capabilitiesMatch) {
    const bullets = capabilitiesMatch[0].matchAll(/[-*]\s*\*\*([^*]+)\*\*:?\s*([^\n]+)/g);
    for (const bullet of bullets) {
      info.capabilities!.push(`${bullet[1]}: ${bullet[2]}`.trim());
    }
  }

  // Etsii maksutiedot
  const paymentMatch = content.match(/payment:\s*\n([\s\S]*?)(?=\n\w|$)/i);
  if (paymentMatch) {
    const paymentBlock = paymentMatch[1];
    const protocol = paymentBlock.match(/protocol:\s*(\w+)/);
    const currency = paymentBlock.match(/currency:\s*(\w+)/);
    const amount = paymentBlock.match(/amount:\s*"?([^"\n]+)"?/);
    const network = paymentBlock.match(/network:\s*(\w+)/);

    if (protocol || currency) {
      info.paymentInfo = {
        protocol: protocol?.[1] || 'x402',
        currency: currency?.[1] || 'USDC',
        amount: amount?.[1],
        network: network?.[1],
      };
    }
  }

  // Vaihtoehtoinen maksutietojen etsintä
  if (!info.paymentInfo) {
    const x402Match = content.match(/x402/i);
    const usdcMatch = content.match(/USDC/i);
    if (x402Match || usdcMatch) {
      info.paymentInfo = {
        protocol: 'x402',
        currency: 'USDC',
        network: 'base',
      };
    }
  }

  return info;
}

// Parsii README tiedoston
function parseReadmeFile(content: string, filePath: string): Partial<AgentInfo> {
  const info: Partial<AgentInfo> = {
    readmeFile: filePath,
  };

  // Etsii otsikosta nimen
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) info.name = titleMatch[1].trim();

  // Etsii kuvauksen (ensimmäinen kappale otsikon jälkeen)
  const descMatch = content.match(/^#\s+.+\n+([^\n#]+)/m);
  if (descMatch) info.description = descMatch[1].trim();

  return info;
}

// Etsii tiedostoja rekursiivisesti
function findFiles(dir: string, patterns: string[]): string[] {
  const results: string[] = [];
  
  try {
    if (!fs.existsSync(dir)) return results;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Skip node_modules
        if (item.name === 'node_modules') continue;
        results.push(...findFiles(fullPath, patterns));
      } else if (item.isFile()) {
        for (const pattern of patterns) {
          if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
            if (regex.test(item.name)) {
              results.push(fullPath);
              break;
            }
          } else if (item.name.toLowerCase() === pattern.toLowerCase()) {
            results.push(fullPath);
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Virhe kansiossa ${dir}:`, error);
  }
  
  return results;
}

// Etsii agentin kansion
function getAgentDir(filePath: string): string {
  return path.dirname(filePath);
}

// Pääfunktio: tutkii agentit
async function exploreAgents(): Promise<AgentInfo[]> {
  const agents: Map<string, AgentInfo> = new Map();

  console.log('🔍 Etsitään Moltbook-agentteja...\n');

  for (const searchPath of CONFIG.SEARCH_PATHS) {
    console.log(`📂 Tutkitaan: ${searchPath}`);

    // Etsi skill-tiedostot
    const skillFiles = findFiles(searchPath, CONFIG.SKILL_FILE_PATTERNS);
    console.log(`   Löytyi ${skillFiles.length} skill-tiedostoa`);

    for (const skillFile of skillFiles) {
      const agentDir = getAgentDir(skillFile);
      const content = fs.readFileSync(skillFile, 'utf-8');
      const info = parseSkillFile(content, skillFile);
      
      const key = agentDir;
      const existing = agents.get(key) || {
        name: '',
        path: agentDir,
        description: '',
        category: '',
        capabilities: [],
        endpoints: [],
      };

      agents.set(key, { ...existing, ...info, path: agentDir });
    }

    // Etsi README-tiedostot agenttikansioista
    const readmeFiles = findFiles(searchPath, CONFIG.README_PATTERNS);
    for (const readmeFile of readmeFiles) {
      const agentDir = getAgentDir(readmeFile);
      
      // Tarkista onko tämä agenttikansio (sisältää agent-sanan tai skill-tiedoston)
      const dirName = path.basename(agentDir).toLowerCase();
      if (!dirName.includes('agent') && !agents.has(agentDir)) continue;

      const content = fs.readFileSync(readmeFile, 'utf-8');
      const info = parseReadmeFile(content, readmeFile);
      
      const existing = agents.get(agentDir);
      if (existing) {
        if (!existing.name && info.name) existing.name = info.name;
        if (!existing.description && info.description) existing.description = info.description;
        existing.readmeFile = readmeFile;
      }
    }

    // Etsi agenttikooditiedostot
    const codeFiles = findFiles(searchPath, CONFIG.AGENT_FILE_PATTERNS);
    console.log(`   Löytyi ${codeFiles.length} agenttikooditiedostoa`);

    for (const codeFile of codeFiles) {
      const agentDir = getAgentDir(codeFile);
      const existing = agents.get(agentDir);
      
      if (existing) {
        existing.codeFile = codeFile;
      } else if (path.basename(codeFile).toLowerCase().includes('agent')) {
        // Luo uusi agentti kooditiedoston perusteella
        agents.set(agentDir, {
          name: path.basename(codeFile, path.extname(codeFile)),
          path: agentDir,
          description: 'Agentti löydetty kooditiedostosta',
          category: 'unknown',
          capabilities: [],
          endpoints: [],
          codeFile: codeFile,
        });
      }
    }
  }

  return Array.from(agents.values()).filter(a => a.name);
}

// Generoi Markdown-raportti
function generateReport(agents: AgentInfo[]): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Moltbook Agentit - Tutkimusraportti

> Generoitu: ${timestamp}
> Löytyi: ${agents.length} agenttia

---

## Yhteenveto

| Agentti | Kategoria | Maksuprotokolla |
|---------|-----------|-----------------|
${agents.map(a => `| ${a.name} | ${a.category || '-'} | ${a.paymentInfo?.protocol || '-'} |`).join('\n')}

---

## Yksityiskohtaiset Tiedot

`;

  for (const agent of agents) {
    report += `### ${agent.name}

**Sijainti:** \`${agent.path}\`

**Kuvaus:** ${agent.description || 'Ei kuvausta'}

**Kategoria:** ${agent.category || 'Määrittelemätön'}

`;

    if (agent.capabilities.length > 0) {
      report += `**Kyvykkyydet:**
${agent.capabilities.map(c => `- ${c}`).join('\n')}

`;
    }

    if (agent.endpoints.length > 0) {
      report += `**API-päätepisteet:**
${agent.endpoints.map(e => `- \`${e}\``).join('\n')}

`;
    }

    if (agent.paymentInfo) {
      report += `**Maksutiedot:**
- Protokolla: ${agent.paymentInfo.protocol}
- Valuutta: ${agent.paymentInfo.currency}
${agent.paymentInfo.amount ? `- Summa: ${agent.paymentInfo.amount}` : ''}
${agent.paymentInfo.network ? `- Verkko: ${agent.paymentInfo.network}` : ''}

`;
    }

    if (agent.skillFile || agent.codeFile || agent.readmeFile) {
      report += `**Tiedostot:**
${agent.skillFile ? `- Skill: \`${path.basename(agent.skillFile)}\`` : ''}
${agent.codeFile ? `- Koodi: \`${path.basename(agent.codeFile)}\`` : ''}
${agent.readmeFile ? `- README: \`${path.basename(agent.readmeFile)}\`` : ''}

`;
    }

    report += `---

`;
  }

  report += `## Moltbook-ekosysteemin Yleiskuvaus

### Mitä Moltbook on?
Moltbook on sosiaalinen verkosto AI-agenteille. Se mahdollistaa:
- Agenttien välisen kommunikaation
- Palveluiden löytämisen ja käyttämisen
- Maksujen käsittelyn x402-protokollalla

### x402-maksuprotokolla
x402 on HTTP-natiivi maksuprotokolla, joka toimii näin:
1. Agentti kutsuu API:a
2. API palauttaa 402 Payment Required + maksutiedot
3. Agentti maksaa USDC:llä (Base-verkossa)
4. Agentti toistaa kutsun maksutuodistuksen kanssa
5. API palauttaa vastauksen

### AsterPay
AsterPay on maksuinfrastruktuuri agenteille:
- Lompakkojen luonti
- x402-maksujen käsittely
- USDC → EUR muunnos (SEPA Instant)

---

*Raportti generoitu Moltbook Explorer Agentilla*
`;

  return report;
}

// Pääohjelma
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🤖 Moltbook Explorer Agent');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Tutki agentit
    const agents = await exploreAgents();

    console.log(`\n✅ Löytyi ${agents.length} agenttia:\n`);
    for (const agent of agents) {
      console.log(`   📦 ${agent.name}`);
      console.log(`      ${agent.description?.substring(0, 60)}...`);
      console.log('');
    }

    // Generoi raportti
    const report = generateReport(agents);
    
    // Tallenna raportti
    fs.writeFileSync(CONFIG.OUTPUT_FILE, report, 'utf-8');
    console.log(`📄 Raportti tallennettu: ${CONFIG.OUTPUT_FILE}`);

    // Tulosta yhteenveto
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 YHTEENVETO');
    console.log('═══════════════════════════════════════════════════\n');
    
    for (const agent of agents) {
      console.log(`🔹 ${agent.name}`);
      if (agent.category) console.log(`   Kategoria: ${agent.category}`);
      if (agent.paymentInfo) console.log(`   Maksu: ${agent.paymentInfo.protocol} / ${agent.paymentInfo.currency}`);
      if (agent.capabilities.length > 0) {
        console.log(`   Kyvyt: ${agent.capabilities.length} kpl`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Virhe:', error);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════\n');
}

// Aja
main();
