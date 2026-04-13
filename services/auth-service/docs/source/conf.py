import os
import sys

# Auth-service root (venv içinden çalışıyoruz, direkt app import edebilir)
sys.path.insert(0, os.path.abspath('../..'))

project = 'Eventra'
copyright = '2026, Eventra Team'
author = 'Eventra Team'
release = '0.1.0'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.napoleon',
    'sphinx.ext.todo',
]

templates_path = ['_templates']
exclude_patterns = []

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

autodoc_member_order = 'bysource'
todo_include_todos = True
