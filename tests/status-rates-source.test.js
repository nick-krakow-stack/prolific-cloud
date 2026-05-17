const fs = require('fs');

const source = fs.readFileSync('api/data.php', 'utf8');

const checks = [
  [
    'status stats counts returned as rejected',
    /\$returned\s*=\s*\$normalizedCounts\['RETURNED'\]\s*\?\?\s*0;/.test(source) &&
      /\$rejected\s*=\s*\(\$normalizedCounts\['REJECTED'\]\s*\?\?\s*0\)\s*\+\s*\$returned;/.test(source)
  ],
  [
    'status stats rejection rate uses combined rejected count',
    /'rejectionRate'\s*=>\s*percentage\(\$rejected,\s*\$total\)/.test(source)
  ],
  [
    'requester analysis treats returned as rejected',
    /in_array\(\$status,\s*\['REJECTED',\s*'RETURNED'\],\s*true\)/.test(source) &&
      /\$items\[\$requester\]\['rejectedCount'\]\s*\+=\s*\$count;/.test(source)
  ]
];

let failed = 0;

for (const [label, passed] of checks) {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);

  if (!passed) {
    failed++;
  }
}

if (failed > 0) {
  process.exit(1);
}
