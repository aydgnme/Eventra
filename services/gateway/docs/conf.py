import sys, os
sys.path.insert(0, os.path.abspath('..'))

project = 'Eventra Gateway'
copyright = '2026, Eventra'
author = 'Eventra'
release = '1.0'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

language = 'en'

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']
