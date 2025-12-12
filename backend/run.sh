# Check if virtual environment is already active
if [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi

python3 app.py
