import pandas as pd
import json
import os

INPUT_FILE = 'VR_Feature_List_demo.xlsx'
OUTPUT_FILE = 'server/data/knowledge_base.json'

def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip()

def extract_vehicle_rules(xls):
    """Extract rules from Vehicle sheet."""
    rules = []
    df = pd.read_excel(xls, sheet_name='Vehicle', header=None)
    
    # Rules are in column 1, rows 2-6
    for i in range(2, 7):
        val = df.iloc[i, 1]
        if pd.notna(val):
            val_str = clean_text(val)
            if len(val_str) > 10 and val_str[0].isdigit():
                rules.append(val_str)
    
    return rules

def extract_vehicle_intents(xls):
    """Extract intents from Vehicle Query sheet - one per intent."""
    intents = []
    seen_intents = set()
    df = pd.read_excel(xls, sheet_name='Vehicle Query')
    
    # Clean column names
    df.columns = [str(c).strip() for c in df.columns]
    
    # Track last values for inheritance
    last_ability = ''
    last_feature = ''
    last_intent = ''
    
    for _, row in df.iterrows():
        ability = clean_text(row.get('Ability', ''))
        feature = clean_text(row.get('Feature', ''))
        intent = clean_text(row.get('Intent', ''))
        query = clean_text(row.get('Query', ''))
        
        # Inherit from previous row if empty
        if ability:
            last_ability = ability
        if feature:
            last_feature = feature
        if intent:
            last_intent = intent
        
        # Only add first occurrence of each intent
        if query and last_intent and last_intent not in seen_intents:
            seen_intents.add(last_intent)
            intents.append({
                "domain": "Vehicle",
                "ability": last_ability,
                "feature": last_feature,
                "intent": last_intent,
                "query": query
            })
    
    return intents

def preprocess():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    xls = pd.ExcelFile(INPUT_FILE)
    
    # Extract Vehicle data only
    rules = extract_vehicle_rules(xls)
    intents = extract_vehicle_intents(xls)
    
    knowledge_base = {
        "rules": rules,
        "intents": intents
    }
    
    print(f"Total rules: {len(rules)}")
    print(f"Total intents: {len(intents)}")
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
    
    print(f"Knowledge base saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    preprocess()
