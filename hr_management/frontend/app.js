const API_BASE = 'http://localhost:8000';

// Tab Switching
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// File Upload Display
document.getElementById('resume-file').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'No file selected';
    document.getElementById('file-status').textContent = `Selected: ${fileName}`;
});

// Resume Upload Form
document.getElementById('resume-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const resultDiv = document.getElementById('resume-result');
    
    // Get form data
    const file = document.getElementById('resume-file').files[0];
    const skills = document.getElementById('required-skills').value;
    const experience = document.getElementById('min-experience').value;
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    // Show loading
    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'inline';
    resultDiv.style.display = 'none';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('required_skills', skills);
        formData.append('min_experience', experience);
        
        const response = await fetch(`${API_BASE}/api/resume/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = `
                <h3>✅ Resume Processed Successfully</h3>
                <div style="margin-top: 16px;">
                    <p><strong>Candidate ID:</strong> ${data.candidate_id}</p>
                    <p><strong>Overall Score:</strong> 
                        <span class="score-badge ${getScoreClass(data.overall_score)}">
                            ${data.overall_score}/100
                        </span>
                    </p>
                    <p><strong>Qualified:</strong> ${data.is_qualified ? '✅ Yes' : '❌ No'}</p>
                    
                    <div style="margin-top: 16px;">
                        <strong>Matched Skills (${data.matched_skills.length}):</strong>
                        <div class="skills-list" style="margin-top: 8px;">
                            ${data.matched_skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
                        </div>
                    </div>
                    
                    ${data.missing_skills.length > 0 ? `
                    <div style="margin-top: 16px;">
                        <strong>Missing Skills (${data.missing_skills.length}):</strong>
                        <div class="skills-list" style="margin-top: 8px;">
                            ${data.missing_skills.map(s => `<span class="skill-tag" style="background:#fee2e2;color:#991b1b;">${s}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        } else {
            throw new Error(data.detail || 'Upload failed');
        }
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        resultDiv.className = 'result-box error';
        resultDiv.innerHTML = `
            <h3>❌ Error</h3>
            <p>${error.message}</p>
        `;
        resultDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        loader.style.display = 'none';
    }
});

// Get Top Candidates
async function loadCandidates() {
    const limit = document.getElementById('candidate-limit').value;
    const resultDiv = document.getElementById('candidates-result');
    
    resultDiv.innerHTML = '<p class="empty-state">Loading...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/api/candidates/top?limit=${limit}`);
        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0) {
            resultDiv.innerHTML = data.candidates.map(c => `
                <div class="candidate-card">
                    <div class="candidate-header">
                        <div>
                            <div class="candidate-name">${c.name || 'Unknown'}</div>
                            <div class="candidate-email">${c.email || 'No email'}</div>
                        </div>
                        <span class="score-badge ${getScoreClass(c.overall_score)}">
                            ${c.overall_score || 0}
                        </span>
                    </div>
                    
                    <p style="font-size: 13px; color: var(--text-light); margin-bottom: 8px;">
                        📍 ${c.location || 'Location not specified'}
                    </p>
                    
                    <p style="font-size: 13px; color: var(--text-light);">
                        💼 ${c.years_of_experience || 0} years experience
                    </p>
                    
                    ${c.skills && c.skills.length > 0 ? `
                        <div class="skills-list">
                            ${c.skills.slice(0, 5).map(s => `<span class="skill-tag">${s}</span>`).join('')}
                            ${c.skills.length > 5 ? `<span class="skill-tag">+${c.skills.length - 5} more</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('');
        } else {
            resultDiv.innerHTML = '<p class="empty-state">No candidates found. Upload some resumes first!</p>';
        }
        
    } catch (error) {
        resultDiv.innerHTML = `<p class="empty-state" style="color: var(--danger);">Error: ${error.message}</p>`;
    }
}

document.getElementById('refresh-candidates').addEventListener('click', loadCandidates);
document.getElementById('candidate-limit').addEventListener('change', loadCandidates);

// Onboarding Form
document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const resultDiv = document.getElementById('onboarding-result');
    
    const requestData = {
        employee_name: document.getElementById('employee-name').value,
        role: document.getElementById('employee-role').value,
        department: document.getElementById('employee-department').value,
        start_date: document.getElementById('start-date').value,
        employee_background: document.getElementById('employee-background').value
    };
    
    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'inline';
    resultDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/api/onboarding/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.plan) {
            const plan = data.plan;
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = `
                <h3>✅ Onboarding Plan Generated</h3>
                <p style="margin: 16px 0;"><strong>Overview:</strong> ${plan.overview || 'N/A'}</p>
                
                <div class="onboarding-plan">
                    ${plan.days && plan.days.length > 0 ? plan.days.map(day => `
                        <div class="day-item">
                            <div class="day-header">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div class="day-number">${day.day}</div>
                                    <div>
                                        <strong>${day.theme || 'Day ' + day.day}</strong>
                                        <div style="font-size: 13px; color: var(--text-light);">
                                            ${day.date || ''} ${day.day_of_week ? '(' + day.day_of_week + ')' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${day.activities && day.activities.length > 0 ? `
                                <div style="margin-top: 12px;">
                                    <strong style="font-size: 14px;">Activities:</strong>
                                    ${day.activities.map(act => `
                                        <div class="activity-item">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                                <strong style="font-size: 14px;">${act.activity || ''}</strong>
                                                <span style="font-size: 12px; color: var(--text-light);">${act.time || ''}</span>
                                            </div>
                                            <p style="font-size: 13px; color: var(--text-light); margin-bottom: 4px;">
                                                ${act.description || ''}
                                            </p>
                                            <p style="font-size: 12px; color: var(--text-light);">
                                                👤 ${act.owner || 'TBD'} • ⏱️ ${act.duration || 'TBD'}
                                            </p>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            ${day.goals && day.goals.length > 0 ? `
                                <div style="margin-top: 12px;">
                                    <strong style="font-size: 14px;">Goals:</strong>
                                    <ul style="margin-left: 20px; margin-top: 4px; font-size: 13px;">
                                        ${day.goals.map(g => `<li>${g}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : '<p>No daily schedule available</p>'}
                </div>
            `;
        } else {
            throw new Error(data.detail || 'Failed to generate plan');
        }
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        resultDiv.className = 'result-box error';
        resultDiv.innerHTML = `<h3>❌ Error</h3><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        loader.style.display = 'none';
    }
});

// Policy Upload
document.getElementById('policy-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    
    const name = document.getElementById('policy-name').value;
    const category = document.getElementById('policy-category').value;
    const content = document.getElementById('policy-content').value;
    
    if (!name || !content) {
        alert('Please fill in policy name and content');
        return;
    }
    
    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'inline';
    
    try {
        const response = await fetch(`${API_BASE}/api/policy/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{
                name: name,
                content: content,
                category: category || 'General',
                version: '1.0'
            }])
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('✅ Policy uploaded successfully!');
            form.reset();
        } else {
            throw new Error(data.detail || 'Upload failed');
        }
        
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        loader.style.display = 'none';
    }
});

// Policy Q&A
document.getElementById('policy-qa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const btn = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const resultDiv = document.getElementById('policy-result');
    
    const question = document.getElementById('policy-question').value;
    
    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'inline';
    resultDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/api/policy/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.className = 'result-box success';
            resultDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <h3>💬 Answer</h3>
                    <span class="confidence-badge ${data.confidence}">
                        ${data.confidence.toUpperCase()}
                    </span>
                </div>
                
                <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid var(--primary);">
                    <p style="line-height: 1.8;">${data.answer}</p>
                </div>
                
                ${data.sources && data.sources.length > 0 ? `
                    <div>
                        <strong>📚 Sources (${data.sources.length}):</strong>
                        ${data.sources.map(s => `
                            <div class="source-item">
                                <div class="source-header">${s.policy_name || 'Unknown Policy'}</div>
                                <p style="font-size: 13px; color: var(--text-light); margin-top: 4px;">
                                    ${s.content || ''}
                                </p>
                                <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
                                    Category: ${s.category || 'General'}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
        } else {
            throw new Error(data.detail || 'Query failed');
        }
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        resultDiv.className = 'result-box error';
        resultDiv.innerHTML = `<h3>❌ Error</h3><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        loader.style.display = 'none';
    }
});

// Helper Functions
function getScoreClass(score) {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

// Set default start date to today
document.getElementById('start-date').valueAsDate = new Date();
