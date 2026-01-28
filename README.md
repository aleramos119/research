# Django + React Project

A full-stack web application with Django REST Framework backend and React frontend.

## Project Structure

```
research/
├── backend/          # Django backend
│   ├── backend/      # Django project settings
│   ├── api/         # Django app
│   └── manage.py
├── frontend/         # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
├── requirements.txt  # Python dependencies
└── README.md
```

## Setup Instructions

### Backend Setup (Django)

1. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run database migrations:
```bash
cd backend
python manage.py migrate
```

4. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

5. Start the Django development server:
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### Frontend Setup (React)

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Features

- **Django REST Framework**: RESTful API backend
- **CORS Headers**: Configured for cross-origin requests
- **React**: Modern frontend framework
- **Axios**: HTTP client for API calls
- **Health Check Endpoint**: `/api/health/` to verify backend connectivity

## Development

- Backend API: `http://localhost:8000`
- Frontend App: `http://localhost:3000`
- Django Admin: `http://localhost:8000/admin`

The React app is configured to proxy API requests to the Django backend.

## Next Steps

1. Add your models in `backend/api/models.py`
2. Create serializers and viewsets for your API
3. Build your React components in `frontend/src/`
4. Configure authentication if needed
5. Set up environment variables for production
