#!/usr/bin/env python3
"""Run on the MySQL host; credentials come from the mysql client's defaults file."""
import argparse
import json
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--database', default='production')
mode = parser.add_mutually_exclusive_group(required=True)
mode.add_argument('--rehearsal', action='store_true')
mode.add_argument('--writes-paused', action='store_true')
args = parser.parse_args()


def query(sql):
    result = subprocess.run(
        ['mysql', '--default-character-set=utf8mb4', '--batch', '--raw',
         '--skip-column-names', args.database],
        input="SET time_zone='+00:00'; SET SESSION TRANSACTION READ ONLY; " + sql,
        text=True, capture_output=True, check=True,
    )
    return result.stdout.splitlines()


def identifier(name):
    return '`' + name.replace('`', '``') + '`'


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


try:
    tables = query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME!='__drizzle_migrations' ORDER BY TABLE_NAME;")
    emit({'kind': 'manifest', 'version': 1, 'rehearsal': args.rehearsal, 'tables': tables})
    for table in tables:
        columns = [json.loads(line) for line in query(
            "SELECT JSON_OBJECT('name',COLUMN_NAME,'type',DATA_TYPE) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=" + literal(table) + " ORDER BY ORDINAL_POSITION;"
        )]
        emit({'kind': 'table', 'name': table, 'columns': columns})
        fields = []
        for column in columns:
            name, kind = column['name'], column['type']
            value = identifier(name)
            if kind in ('blob', 'tinyblob', 'mediumblob', 'longblob', 'binary', 'varbinary'):
                value = 'HEX(' + value + ')'
            else:
                value = 'CAST(' + value + ' AS CHAR CHARACTER SET utf8mb4)'
            fields.extend([literal(name), value])
        rows = query('SELECT JSON_OBJECT(' + ','.join(fields) + ') FROM ' + identifier(table) + ';')
        for row in rows:
            emit({'kind': 'row', 'table': table, 'values': json.loads(row)})
        emit({'kind': 'end-table', 'name': table, 'count': len(rows)})
    emit({'kind': 'complete'})
except Exception:
    print('Export failed; discard the incomplete output.', file=sys.stderr)
    sys.exit(1)
