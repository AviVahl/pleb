export interface FindUpHost {
  statSync(path: string): { isFile(): boolean };
  dirname(path: string): string;
  join(...segments: string[]): string;
}

export function findFileUpSync(directoryPath: string, fileName: string, host: FindUpHost) {
  for (const directoryInChain of pathChainToRoot(directoryPath, host.dirname)) {
    const filePath = host.join(directoryInChain, fileName);
    try {
      if (host.statSync(filePath).isFile()) {
        return filePath;
      }
    } catch {}
  }
  return;
}

function* pathChainToRoot(currentPath: string, dirname: (path: string) => string) {
  let lastPath: string | undefined;
  while (lastPath !== currentPath) {
    yield currentPath;
    lastPath = currentPath;
    currentPath = dirname(currentPath);
  }
}
