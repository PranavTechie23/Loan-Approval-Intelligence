import sys
import pandas as pd
import numpy as np

def clean_data(input_file, output_file):
    try:
        # Load CSV
        print(f"Loading data from {input_file}...")
        df = pd.read_csv(input_file)

        # Remove duplicate rows
        initial_shape = df.shape
        df = df.drop_duplicates()
        print(f"Removed {(initial_shape[0] - df.shape[0])} duplicate rows.")

        # Handle missing values
        # Fill numeric missing values with mean
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isnull().any():
                mean_val = df[col].mean()
                df[col] = df[col].fillna(mean_val)
        
        # Also clean up negative values in income and loan amount by taking absolute
        if 'ApplicantIncome' in df.columns:
            df['ApplicantIncome'] = df['ApplicantIncome'].abs()
        if 'LoanAmount' in df.columns:
            df['LoanAmount'] = df['LoanAmount'].abs()

        # Convert Loan_Status: Y -> Approved, N -> Rejected
        if 'Loan_Status' in df.columns:
            df['Loan_Status'] = df['Loan_Status'].map({'Y': 'Approved', 'N': 'Rejected'}).fillna('Rejected')

        # Drop any remaining unhandled NaNs (just in case)
        df = df.dropna()

        # Output stats
        stats = {
            "totalUploaded": initial_shape[0],
            "recordsAfterCleaning": df.shape[0],
            "duplicatesRemoved": initial_shape[0] - df.shape[0]
        }
        import json
        print(f"__STATS__{json.dumps(stats)}__STATS__")

        # Save to output file
        df.to_csv(output_file, index=False)
        print(f"Cleaned data saved to {output_file}.")
    except Exception as e:
        print(f"Error processing data: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python data_processing.py <input_csv> <output_csv>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    clean_data(input_path, output_path)
