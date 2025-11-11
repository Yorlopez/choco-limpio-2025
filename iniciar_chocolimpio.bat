@echo off
echo INICIANDO CHOCÓ LIMPIO 2025...
start "" "C:\xampp\xampp-control.exe"
timeout /t 10
pip install flask mysql-connector-python
cd "C:\Users\mosqu\OneDrive\Desktop\pfe"
python app.py
pause