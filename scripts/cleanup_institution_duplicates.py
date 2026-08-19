from pathlib import Path

p = Path('src/AppFinal.tsx')
lines = p.read_text().splitlines()

# These definitions are deliberately single-line in AppFinal.tsx.
single_prefixes = [
    'function CosmicLogo(',
    'function BrandLockup(',
    'function InstitutionDashboard(',
    'function InstitutionPendingOrders(',
    'function InstitutionOperations(',
]
seen = {k: False for k in single_prefixes}
out = []
i = 0
nav_seen = False
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    matched = next((k for k in single_prefixes if stripped.startswith(k)), None)
    if matched:
        if seen[matched]:
            i += 1
            continue
        seen[matched] = True
        out.append(line)
        i += 1
        continue
    if stripped == 'const institutionNav=[':
        block = [line]
        i += 1
        while i < len(lines):
            block.append(lines[i])
            if lines[i].strip() == '];':
                i += 1
                break
            i += 1
        if not nav_seen:
            out.extend(block)
            nav_seen = True
        continue
    out.append(line)
    i += 1

text = '\n'.join(out) + '\n'
for prefix in single_prefixes:
    count = sum(1 for line in out if line.strip().startswith(prefix))
    if count != 1:
        raise SystemExit(f'{prefix} count={count}, expected 1')
if sum(1 for line in out if line.strip() == 'const institutionNav=[') != 1:
    raise SystemExit('institutionNav must occur exactly once')
p.write_text(text)
