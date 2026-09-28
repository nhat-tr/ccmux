import json
from pathlib import Path

review_directory = Path(__file__).resolve().parent.parent
colors = json.loads((review_directory / 'design-system.json').read_text())['colors']
example_rows = json.loads((review_directory / 'example-data.json').read_text())['rows']
scenes = []
inventory = []
for is_compact in [False, True]:
    columns, rows = (64, 18) if is_compact else (96, 30)
    for has_recovery in [False, True]:
        for scale in [1, 1.5]:
            cell_width_px, cell_height_px = int(10 * scale), int(20 * scale)
            size = f'{columns * cell_width_px}x{rows * cell_height_px}'
            screen = 'ccmux-attention-' + ('compact' if is_compact else 'wide')
            if has_recovery:
                screen += '-recovery'
            lines = []
            masks = []

            def add_line(row, text, color='text', column=2, is_bold=False, private_fields=()):
                if len(text) + column > columns:
                    raise ValueError(f'Text exceeds {columns} columns at row {row}: {text}')
                lines.append({'column': column, 'row': row, 'text': text,
                              'color': colors[color], 'isBold': is_bold})
                for field_text, kind in private_fields:
                    offset = text.index(field_text)
                    masks.append({'x': (column + offset) * cell_width_px,
                                  'y': row * cell_height_px,
                                  'width': len(field_text) * cell_width_px,
                                  'height': cell_height_px, 'kind': kind})

            add_line(0, '+' + '-' * (columns - 2) + '+', 'muted', column=0)
            add_line(rows - 1, '+' + '-' * (columns - 2) + '+', 'muted', column=0)
            add_line(1, 'Agent attention     4 pending items / 3 rows', 'cyan', is_bold=True)
            add_line(2, 'All tracked (5)     / Search     f Pending / All', 'muted')
            if is_compact:
                add_line(3, 'Mac: checked 3s | Workbench WB-payments: unavailable 2m', 'warning')
                add_line(4, 'Workbench WB-sandbox: Not yet checked', 'warning')
                add_line(5, 'Project / agent / source       State      Items / wait', 'muted')
                if has_recovery:
                    native_id = example_rows[1]['nativeId']
                    add_line(6, '> api-workers / Codex / Workbench WB-payments', is_bold=True,
                             private_fields=[('api-workers', 'project')])
                    add_line(7, '  Error stop (last)      Error: 1 item, waiting 4m', 'error',
                             private_fields=[('4m', 'wait')])
                    add_line(8, 'Pane verification failed. Selection and item retained.', 'warning')
                    add_line(9, 'Source: Workbench WB-payments (unavailable 2m)')
                    add_line(10, 'Directory: /workspace/api-workers',
                             private_fields=[('api-workers', 'project')])
                    add_line(11, 'Native Runtime Session: ' + native_id, 'muted',
                             private_fields=[(native_id, 'native-id')])
                    add_line(12, 'Host: workbench attach WB-payments', 'cyan')
                    add_line(13, 'Inside: cd /workspace/api-workers', 'cyan',
                             private_fields=[('api-workers', 'project')])
                    add_line(14, 'codex resume ' + native_id, 'cyan',
                             private_fields=[(native_id, 'native-id')])
                else:
                    native_id = example_rows[0]['nativeId']
                    add_line(6, '> architectural-ref... / Codex / Mac', is_bold=True,
                             private_fields=[('architectural-ref...', 'project')])
                    add_line(7, '  Waiting input     Input / approval: 2 items, 12m', 'warning',
                             private_fields=[('12m', 'wait')])
                    add_line(8, '  api-workers / Codex / Workbench WB-payments', 'muted',
                             private_fields=[('api-workers', 'project')])
                    add_line(9, '  Error stop (last)   Error: 1 item, 4m', 'error',
                             private_fields=[('4m', 'wait')])
                    add_line(10, '  question-report / Codex / Mac   Reply ready: 1 item, 2m',
                             private_fields=[('question-report', 'project'), ('2m', 'wait')])
                    add_line(11, 'Rows 1-3 of 5    j/k scroll; selected details below', 'muted')
                    add_line(12, example_rows[0]['project'], is_bold=True,
                             private_fields=[(example_rows[0]['project'], 'project')])
                    add_line(13, 'Input selection (12m); approval requested (11m)', 'warning',
                             private_fields=[('12m', 'wait'), ('11m', 'wait')])
                    add_line(14, 'Native Runtime Session: ' + native_id, 'muted',
                             private_fields=[(native_id, 'native-id')])
                add_line(15, '/ Search   f Pending / All   c Clear selected row', 'cyan')
                add_line(16, 'j/k Select   Esc Close (no resume performed)' if has_recovery
                         else 'j/k Select   Enter Go to conversation   Esc Close', 'cyan')
                selection_rows = [6, 7]
            else:
                add_line(4, 'Source coverage', 'muted', is_bold=True)
                add_line(5, 'Mac: checked 3s     Workbench WB-payments: unavailable 2m', 'warning')
                add_line(6, 'Workbench WB-sandbox: Not yet checked', 'warning')
                add_line(7, f"  {'PROJECT':<19}{'AGENT':<7}{'LOCATION':<24}{'WORK STATE':<18}{'PENDING':<19}WAIT", 'muted')
                selected_index = 1 if has_recovery else 0
                for index, item in enumerate(example_rows):
                    project = item['project']
                    if len(project) > 18:
                        project = project[:15] + '...'
                    prefix = '> ' if index == selected_index else '  '
                    location = item['source'] if item['source'] == 'Mac' else 'Workbench ' + item['source']
                    text = (f"{prefix}{project:<19}{item['agent']:<7}{location:<24}"
                            f"{item['state']:<18}{item['count']} {item['reason']:<16} {item['wait']}")
                    fields = [(project, 'project')]
                    if item['wait'] != '-':
                        fields.append((item['wait'], 'wait'))
                    add_line(9 + index * 2, text,
                             'cyan' if index == selected_index else ('error' if index == 1 else 'text'),
                             is_bold=index == selected_index, private_fields=fields)
                add_line(20, '-' * (columns - 4), 'muted')
                if has_recovery:
                    native_id = example_rows[1]['nativeId']
                    add_line(21, 'Pane verification failed - selection and pending record retained', 'warning', is_bold=True)
                    add_line(22, 'Source: Workbench WB-payments (unavailable 2m)   Directory: /workspace/api-workers',
                             private_fields=[('api-workers', 'project')])
                    add_line(23, 'Native Runtime Session: ' + native_id, 'muted',
                             private_fields=[(native_id, 'native-id')])
                    add_line(24, 'Host: workbench attach WB-payments', 'cyan')
                    add_line(25, 'Inside: cd /workspace/api-workers; codex resume ' + native_id, 'cyan',
                             private_fields=[('api-workers', 'project'), (native_id, 'native-id')])
                else:
                    native_id = example_rows[0]['nativeId']
                    add_line(21, 'Selected: ' + example_rows[0]['project'] + ' / Codex / Mac', is_bold=True,
                             private_fields=[(example_rows[0]['project'], 'project')])
                    add_line(22, 'Pending items: input selection (12m); approval requested (11m)', 'warning',
                             private_fields=[('12m', 'wait'), ('11m', 'wait')])
                    add_line(23, 'Native Runtime Session: ' + native_id, 'muted',
                             private_fields=[(native_id, 'native-id')])
                    add_line(24, 'Viewing and navigation preserve both pending items.', 'muted')
                    add_line(25, 'Enter verifies the existing pane before selecting it.', 'muted')
                add_line(27, 'j/k Select   / Search   f Pending / All   c Clear selected row', 'cyan')
                add_line(28, 'j/k Select another row   Esc Close (no automatic resume)' if has_recovery
                         else 'Enter Go to conversation   Esc Close', 'cyan')
                selection_rows = [9 + selected_index * 2]
            rectangles = [{'x': 0, 'y': row * cell_height_px, 'width': columns * cell_width_px,
                           'height': cell_height_px, 'color': colors['selection']} for row in selection_rows]
            name = f'{screen}-{size}'
            scenes.append({'name': name, 'columns': columns, 'rows': rows,
                           'cellWidthPx': cell_width_px, 'cellHeightPx': cell_height_px,
                           'fontSizePt': 13 * scale, 'background': colors['background'],
                           'rectangles': rectangles, 'lines': lines})
            inventory.append({'screen': screen, 'file': f'screens/{name}.png', 'size': size,
                              'clientCells': [80, 24] if is_compact else [120, 40],
                              'popupCells': [columns, rows], 'textScalePercent': int(scale * 100),
                              'masks': masks, 'approval': 'proposed'})
(review_directory / 'terminal-scenes.json').write_text(json.dumps(scenes, indent=2) + '\n')
(review_directory / 'screen-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
print(f'{len(scenes)} static reference scenes prepared')
