const fs = require('fs');

function replaceFileContent(filePath, rules) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    rules.forEach(({ search, replace }) => {
        content = content.split(search).join(replace);
    });
    
    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + filePath);
    }
}

replaceFileContent('components/ui/StatusPill.tsx', [
    { search: 'bodyline-status-pill', replace: 'status-pill' }
]);
replaceFileContent('components/ui/Avatar.tsx', [
    { search: 'bodyline-avatar', replace: 'avatar-icon' }
]);
replaceFileContent('components/ui/Nav.tsx', [
    { search: 'Bodyline', replace: 'Gym' }
]);

const pages = [
    'app/dashboard/members/page.tsx',
    'app/dashboard/trainers/page.tsx',
    'app/dashboard/payments/page.tsx',
    'app/member/page.tsx',
    'app/trainer/page.tsx',
    'app/layout.tsx'
];
pages.forEach(page => {
    replaceFileContent(page, [
        { search: 'Bodyline<span>.</span>', replace: 'Gym<span>.</span>' },
        { search: 'The Bodyline Gym', replace: 'The Gym' }
    ]);
});

replaceFileContent('app/page.tsx', [
    { search: 'BODYLINE<span>.</span>', replace: 'GYM<span>.</span>' },
    { search: "Bodyline is Gurugram's performance gym", replace: 'Our gym is the ultimate performance center' },
    { search: 'WHY BODYLINE', replace: 'WHY US' },
    { search: 'Why Bodyline', replace: 'Why Choose Us' },
    { search: 'inside Bodyline', replace: 'inside the gym' },
    { search: 'Training at Bodyline', replace: 'Training at our gym' },
    { search: 'any Bodyline location', replace: 'any location' },
    { search: 'Bodyline.', replace: 'The Gym.' },
    { search: 'Join Bodyline today.', replace: 'Join us today.' },
    { search: 'Join Bodyline', replace: 'Join The Gym' },
    { search: 'hello@bodyline.in', replace: 'hello@example.com' },
    { search: 'Bodyline Fitness Pvt. Ltd.', replace: 'Gym Fitness Pvt. Ltd.' },
    { search: 'about%20Bodyline%20membership', replace: 'about%20your%20membership' }
]);
