import pandas as pd
import os

file_path = 'VR_Feature_List_demo.xlsx'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

try:
    xls = pd.ExcelFile(file_path)
    print(f"Found Excel file with {len(xls.sheet_names)} sheets: {xls.sheet_names}")
    
    for sheet_name in xls.sheet_names:
        print(f"\n--- Sheet: {sheet_name} ---")
        df = pd.read_excel(xls, sheet_name=sheet_name, nrows=10) # Read first 10 rows
        print(f"Columns: {list(df.columns)}")
        print("First 5 rows:")
        print(df.head().to_string())
        print("-" * 30)
        
except Exception as e:
    print(f"Error reading excel file: {e}")
