"""Read public schema defaults and CLI catalog from an exact staged source.

Run with that archive's Python environment. No config files or providers are
loaded; model_construct reads declared defaults, never BaseSettings sources.
Print JSON for review; this script never updates the website snapshot itself.
"""

from __future__ import annotations
import argparse
import ast
import json
import inspect
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def collect(kind: str, source: Path, commit: str) -> dict:
    if kind == "core":
        from memtomem.config import Mem2MemConfig
        from memtomem.cli import cli

        model = Mem2MemConfig
        package = source / "packages/memtomem/src/memtomem"
    else:
        from memtomem_stm.config import STMConfig
        from memtomem_stm.cli.proxy import cli

        model = STMConfig
        package = source / "src/memtomem_stm"
    from pydantic import BaseModel
    from click import Context, Group

    if not Path(inspect.getfile(model)).resolve().is_relative_to(package.resolve()):
        raise RuntimeError("Python imports do not match the requested source archive")

    def normalize(value):
        if isinstance(value, BaseModel):
            return {k: normalize(v) for k, v in value.model_dump(mode="json").items()}
        if isinstance(value, Path):
            return str(value).replace(str(Path.home()), "~")
        if isinstance(value, dict):
            return {k: normalize(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [normalize(v) for v in value]
        if isinstance(value, (set, frozenset)):
            return [normalize(v) for v in sorted(value)]
        if isinstance(value, str):
            return value.replace(str(Path.home()), "~")
        return value

    def fields(instance, prefix=""):
        result = {}
        for name in type(instance).model_fields:
            key = prefix + name.upper()
            value = getattr(instance, name)
            if isinstance(value, BaseModel):
                result.update(fields(value, key + "__"))
            else:
                result[key] = normalize(value)
        return result

    commands = {}
    options = {}

    def catalog(command, prefix=""):
        options[prefix] = sorted(
            {
                option
                for param in command.params
                if not getattr(param, "hidden", False)
                for option in [
                    *getattr(param, "opts", []),
                    *getattr(param, "secondary_opts", []),
                ]
                if option.startswith("--")
            }
        )
        if isinstance(command, Group):
            ctx = Context(command)
            names = sorted(command.list_commands(ctx))
            commands[prefix] = names
            for name in names:
                child = command.get_command(ctx, name)
                if child is not None:
                    catalog(child, (prefix + " " + name).strip())

    catalog(cli)
    tools = []
    actions = []
    for path in sorted(package.rglob("*.py")):
        body = path.read_text()
        if "@mcp.tool" not in body and "@register(" not in body:
            continue
        for node in ast.walk(ast.parse(body)):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for deco in node.decorator_list:
                target = deco.func if isinstance(deco, ast.Call) else deco
                if (
                    isinstance(target, ast.Attribute)
                    and isinstance(target.value, ast.Name)
                    and target.value.id == "mcp"
                    and target.attr == "tool"
                ):
                    name = node.name
                    if isinstance(deco, ast.Call):
                        name = next(
                            (
                                kw.value.value
                                for kw in deco.keywords
                                if kw.arg == "name"
                                and isinstance(kw.value, ast.Constant)
                            ),
                            name,
                        )
                    tools.append(name)
                if (
                    isinstance(target, ast.Name)
                    and target.id == "register"
                    and isinstance(deco, ast.Call)
                ):
                    # register's first argument is category, not the public action name.
                    actions.append(node.name)
    prefix = model.model_config["env_prefix"]
    return {
        "commit": commit,
        "environment": {
            prefix + k: v for k, v in sorted(fields(model.model_construct()).items())
        },
        "commands": commands,
        "options": options,
        "tools": sorted(tools),
        "registeredFunctions": sorted(actions),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["core", "stm"])
    parser.add_argument("source", type=Path)
    parser.add_argument("commit")
    parser.add_argument("--isolated-child", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if not args.isolated_child:
        with tempfile.TemporaryDirectory(prefix="website-schema-") as scratch:
            env = {
                k: v
                for k, v in os.environ.items()
                if not k.startswith(
                    ("MEMTOMEM_", "OPENAI_", "ANTHROPIC_", "LANGFUSE_", "OTEL_")
                )
            }
            env.update(
                HOME=scratch,
                USERPROFILE=scratch,
                XDG_CONFIG_HOME=scratch,
                XDG_CACHE_HOME=scratch,
            )
            return subprocess.call(
                [
                    sys.executable,
                    str(Path(__file__).resolve()),
                    args.kind,
                    str(args.source.resolve()),
                    args.commit,
                    "--isolated-child",
                ],
                cwd=scratch,
                env=env,
            )
    print(
        json.dumps(
            collect(args.kind, args.source.resolve(), args.commit),
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
