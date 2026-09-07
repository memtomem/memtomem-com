"""Offline CLI and MCP smoke checks in a temporary home; requires pinned environments."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("core_bin", type=Path)
parser.add_argument("stm_bin", type=Path)
args = parser.parse_args()
core = args.core_bin.resolve()
stm = args.stm_bin.resolve()
with tempfile.TemporaryDirectory(prefix="site-smoke-") as scratch:
    env = {
        k: v
        for k, v in os.environ.items()
        if k in {"PATH", "LANG", "LC_ALL", "TMPDIR", "SYSTEMROOT", "WINDIR"}
    }
    env.update(
        HOME=scratch,
        USERPROFILE=scratch,
        XDG_CONFIG_HOME=scratch,
        XDG_CACHE_HOME=scratch,
        XDG_DATA_HOME=scratch,
        XDG_STATE_HOME=scratch,
        XDG_RUNTIME_DIR=scratch,
        PATH=str(stm) + os.pathsep + str(core) + os.pathsep + os.environ["PATH"],
        MEMTOMEM_STM_SURFACING__ENABLED="false",
        MEMTOMEM_STM_FORMATION__ENABLED="false",
    )

    def run(argv):
        result = subprocess.run(
            [str(x) for x in argv],
            cwd=scratch,
            env=env,
            text=True,
            capture_output=True,
            timeout=90,
        )
        if result.returncode:
            raise RuntimeError(result.stdout + result.stderr)
        print("PASS", Path(argv[0]).name, str(argv[1]))
        return result.stdout

    run(
        [
            core / "mm",
            "init",
            "--preset",
            "minimal",
            "--non-interactive",
            "--mcp",
            "skip",
        ]
    )
    run([core / "mm", "status"])
    run(
        [
            core / "mm",
            "add",
            "Release smoke tests run before traffic cutover",
            "--tags",
            "release,decision",
        ]
    )
    found = run([core / "mm", "search", "release smoke tests"])
    assert "traffic cutover" in found, found
    memory_files = list(Path(scratch).rglob("*.md"))
    assert memory_files, "add did not create a Markdown source"
    run([core / "mm", "index", "--force", memory_files[0]])
    run([core / "mm", "search", "release smoke tests"])
    run([stm / "mms", "init", "--demo", "--client", "auto"])
    run([stm / "mms", "doctor"])
    client = """
import asyncio
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
async def main():
    async with stdio_client(StdioServerParameters(command="memtomem-stm", env=dict(os.environ))) as streams:
        async with ClientSession(*streams) as session:
            await session.initialize()
            names = {t.name for t in (await session.list_tools()).tools}
            assert "demo__demo_search" in names, names
            result = await session.call_tool("demo__demo_search", {"topic": "privacy"})
            assert not result.is_error, result
            assert "Mutating or unverified tools are excluded from the strict cache." in str(result), result
            print("PASS MCP demo__demo_search privacy")
asyncio.run(main())
"""
    output = run([stm / "python", "-c", client])
    assert "PASS MCP" in output
    stats = run([stm / "mms", "stats", "--source", "mcp", "--json"])
    assert "demo_search" in stats, stats
    print("PASS durable MCP metrics")
