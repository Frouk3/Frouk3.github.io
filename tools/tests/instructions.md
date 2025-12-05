Run the tests (PowerShell, from repo root)

1. Ensure Python 3.6+ is installed and on PATH (so `python` and `pip` work).
2. Install pytest (once):
	```powershell
	pip install pytest
	```
3. Run all tests:
	```powershell
	pytest -q
	```
4. Run only the generator tests:
	```powershell
	pytest -q tools/tests/test_generate_blog_index.py
	```

Notes
- Run commands from the repository root so paths resolve correctly.
- If multiple Python versions exist, use `py -3 -m pip install pytest` and `py -3 -m pytest -q` instead.