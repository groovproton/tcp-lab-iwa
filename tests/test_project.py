import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / 'app'

class ProjectSmokeTests(unittest.TestCase):
    def test_manifest(self):
        p = APP / '.well-known' / 'manifest.webmanifest'
        data = json.loads(p.read_text())
        self.assertEqual(data['permissions_policy']['direct-sockets'], ['self'])
        self.assertEqual(data['permissions_policy']['cross-origin-isolated'], ['self'])
        self.assertTrue(data['version'])

    def test_static_files_exist(self):
        for p in ['index.html', 'js/main.js', 'js/tcp.js', 'css/style.css']:
            self.assertTrue((APP / p).is_file(), p)

    def test_no_mongodb_credentials_or_backend(self):
        scripts = '\n'.join(p.read_text() for p in (APP / 'js').glob('*.js'))
        self.assertNotIn('mongodb+srv://', scripts)
        self.assertNotIn('27017', scripts)
        self.assertNotIn('fetch(', scripts)

    def test_scope(self):
        self.assertFalse((ROOT / 'package.json').exists())
        self.assertFalse((APP / 'package.json').exists())

if __name__ == '__main__':
    unittest.main()
