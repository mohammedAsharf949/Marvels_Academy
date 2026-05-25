import os

main_dir = "D:/Marvels Site/EducationWorksheets/Grade_1/Math"

for grade_folder in os.listdir(main_dir):
    grade_path = os.path.join(main_dir, grade_folder)
    if os.path.isdir(grade_path):
        print(f"\n{grade_folder}:")
        for file in os.listdir(grade_path):
            if file.lower().endswith('.pdf'):
                print(f"  {file}")
