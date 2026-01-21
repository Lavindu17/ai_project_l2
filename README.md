# AI-Powered Sprint Retrospective System

An intelligent system that automates sprint retrospective feedback collection through conversational AI, identifies patterns across team responses, and generates actionable insights.

## 🚀 Features

- **AI Interviewer**: Natural conversation-based feedback collection using Google Gemini
- **Anonymous Mode**: Encourages honest feedback
- **Pattern Detection**: Identifies recurring issues across the team
- **Actionable Reports**: Generates specific improvement recommendations
- **Trend Tracking**: Compare sprints over time

## 🛠️ Tech Stack

- **Backend**: Python + Flask
- **AI**: Google Gemini API
- **Database**: Supabase (PostgreSQL)
- **Frontend**: HTML + HTMX + Vanilla CSS/JS
- **Hosting**: Render.com (ready for deployment)

## 📋 Prerequisites

- Python 3.9+
- Gemini API Key ([Get it here](https://aistudio.google.com))
- Supabase Account ([Sign up](https://supabase.com))

## ⚙️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd sprint_retro_v2

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

FLASK_SECRET_KEY=generate_a_random_secret_key
FLASK_ENV=development

ADMIN_PASSWORD=your_secure_admin_password
```

### 3. Database Setup

1. Go to your Supabase project
2. Open the SQL Editor
3. Run the migration file `migrations/001_initial_schema.sql`
4. Verify all tables are created successfully

### 4. Run the Application

```bash
python run.py
```

The application will start at `http://localhost:5000`

## 🎯 Usage Guide

### For Admin/Scrum Master:

1. **Login**: Navigate to `/admin/login` (default password: set in .env)
2. **Create Sprint**: Click "New Sprint" and fill in details
3. **Share Link**: Copy the generated link and share with team
4. **Monitor Progress**: Dashboard shows real-time submission status
5. **Analyze**: Click "Analyze" when all responses are in
6. **View Report**: Review AI-generated insights and recommendations

### For Team Members:

1. **Open Link**: Click the link shared by Scrum Master
2. **Chat with AI**: Answer questions honestly about the sprint
3. **Optional**: Toggle "Submit anonymously" for privacy
4. **Submit**: Click "Submit Retrospective" when done

## 📁 Project Structure

```
sprint_retro_v2/
├── app/
│   ├── routes/          # Flask blueprints (admin, sprint, chat, analysis)
│   ├── services/        # Business logic (database, gemini, analysis)
│   ├── prompts/         # AI prompt templates
│   └── __init__.py      # Flask app factory
├── static/
│   ├── css/             # Stylesheets
│   └── js/              # JavaScript files
├── templates/           # HTML templates
├── migrations/          # Database schema
├── config.py            # Configuration management
├── run.py              # Application entry point
└── requirements.txt     # Python dependencies
```

## 🔑 API Endpoints

### Sprint Management
- `POST /api/sprint/create` - Create new sprint
- `GET /api/sprint/:id/status` - Get submission status
- `PATCH /api/sprint/:id/close` - Close sprint

### Chat Interface
- `GET /chat/:token` - Open chat interface
- `POST /api/chat/message` - Send message to AI
- `POST /api/response/submit` - Submit final response

### Analysis & Reporting
- `POST /api/sprint/:id/analyze` - Trigger AI analysis
- `GET /api/sprint/:id/report` - Get analysis report
- `POST /api/sprint/:current_id/compare/:previous_id` - Compare sprints

## 🔒 Security Features

- UUID-based share URLs (no enumeration)
- Row Level Security (RLS) in Supabase
- Anonymous responses truly anonymous
- Admin password protection
- Session-based authentication

## 🧪 Testing

Run a test retrospective:

1. Create a sprint with 2-3 test team members
2. Open the chat link in incognito windows
3. Have conversations as different team members
4. Submit responses
5. Run analysis
6. Review the generated report

## 🚀 Deployment (Render.com)

1. Push code to GitHub
2. Connect Render to your repository
3. Set environment variables in Render dashboard
4. Deploy!

See detailed deployment instructions in `ProjectPlan` file.

## 📊 How It Works

### Collection Phase
- Team members chat with AI individually
- AI asks about wins, challenges, blockers, and suggestions
- Responses stored in database

### Analysis Phase
- AI processes all responses using Map-Reduce pattern
- Identifies recurring themes across the team
- Calculates sentiment and impact
- Generates specific, actionable recommendations

### Report Phase
- Beautiful HTML report with themes and recommendations
- Priority-based action items
- Sprint-to-sprint comparison
- Exportable as JSON

## 🤝 Contributing

This is a portfolio/personal project. Feel free to fork and customize!

## 📝 License

MIT License - feel free to use for your team!

## 🆘 Troubleshooting

### Gemini API errors
- Check your API key is correct
- Verify you haven't hit rate limits
- Ensure JSON mode is supported in your region

### Database connection issues
- Verify Supabase URL and keys are correct
- Check RLS policies are properly configured
- Ensure service role key is used for admin operations

### Chat not working
- Check session management
- Verify CORS is enabled
- Look for JavaScript console errors

## 📧 Support

Found a bug? Have a feature request? Open an issue!

---

Built with ❤️ using Flask, Gemini AI, and Supabase

**Version**: 1.0.0
**Last Updated**: January 2026
