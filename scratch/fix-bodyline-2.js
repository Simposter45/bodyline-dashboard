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

replaceFileContent('app/onboarding/page.tsx', [
    { search: 'bodyline_guest_member_id', replace: 'gym_guest_member_id' }
]);

replaceFileContent('app/login/page.tsx', [
    { search: 'bodyline.localhost:3000', replace: 'gym1.localhost:3000' },
    { search: 'userEmail === "pradeep@bodyline.in"', replace: 'userEmail.startsWith("pradeep@") || userEmail.startsWith("owner@")' },
    { search: '["karthik@bodyline.in", "divya@bodyline.in", "suresh@bodyline.in"].includes(userEmail)', replace: '["karthik@", "divya@", "suresh@", "trainer@"].some(p => userEmail.startsWith(p))' },
    { search: `            [\n              "karthik@bodyline.in",\n              "divya@bodyline.in",\n              "suresh@bodyline.in",\n            ].includes(userEmail)`, replace: '            ["karthik@", "divya@", "suresh@", "trainer@"].some(p => userEmail.startsWith(p))' }
]);
