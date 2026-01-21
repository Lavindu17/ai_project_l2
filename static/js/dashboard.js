// Dashboard JavaScript

function openCreateModal() {
    document.getElementById('create-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('create-modal').style.display = 'none';
    document.getElementById('create-sprint-form').reset();
    document.getElementById('share-url-section').style.display = 'none';
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    });
}

function copyShareUrl() {
    const input = document.getElementById('share-url');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        alert('Link copied!');
    });
}

async function logout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Handle create sprint form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('create-sprint-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const teamMembersText = formData.get('team_members');

        // Parse team members
        const teamMembers = teamMembersText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                const parts = line.split(',').map(p => p.trim());
                return {
                    name: parts[0],
                    role: parts[1] || 'Team Member'
                };
            });

        const data = {
            name: formData.get('name'),
            start_date: formData.get('start_date'),
            end_date: formData.get('end_date'),
            team_members: teamMembers
        };

        try {
            const response = await fetch('/api/sprint/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                // Show share URL
                document.getElementById('share-url').value = result.share_url;
                form.style.display = 'none';
                document.getElementById('share-url-section').style.display = 'block';
            } else {
                alert('Failed to create sprint: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating sprint:', error);
            alert('Failed to create sprint');
        }
    });
});

// Update progress bars dynamically
document.body.addEventListener('htmx:afterSwap', (event) => {
    if (event.detail.target.classList.contains('progress-section')) {
        const data = JSON.parse(event.detail.xhr.response);
        const progressFill = event.detail.target.querySelector('.progress-fill');
        const progressText = event.detail.target.querySelector('.progress-text');

        if (progressFill && progressText) {
            progressFill.style.width = data.percentage + '%';
            progressText.textContent = `${data.submitted} / ${data.total} submitted (${data.percentage}%)`;
        }
    }
});
