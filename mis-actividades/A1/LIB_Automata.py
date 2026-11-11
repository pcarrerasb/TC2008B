import numpy, mesa
import imageio.v2 as imageio
from matplotlib import pyplot


RULES = {
    (1, 1, 1): 0,
    (1, 1, 0): 1,
    (1, 0, 1): 0,
    (1, 0, 0): 1,
    (0, 1, 1): 1,
    (0, 1, 0): 0,
    (0, 0, 1): 1,
    (0, 0, 0): 0,
}


class XORCell(mesa.Agent):

    def __init__(self, model, row, col):
        super().__init__(model)
        self.row = row
        self.col = col
        self.state = 0
        self.next_state = 0

    def compute(self, wrap):
        grid = self.model.grid
        size = self.model.size
        up = (self.row - 1) % size

        if wrap:
            left = grid[up, (self.col - 1) % size]
            right = grid[up, (self.col + 1) % size]
        else:
            left = grid[up, self.col - 1] if self.col > 0 else 0
            right = grid[up, self.col + 1] if self.col < size - 1 else 0
        center = grid[up, self.col]

        self.next_state = RULES[(int(left), int(center), int(right))]

    def advance(self):
        self.state = self.next_state
        self.model.grid[self.row, self.col] = self.state


class XORAutomaton(mesa.Model):
    def __init__(self, size=50, seed=None):
        super().__init__(rng=seed)
        self.size = size
        self.grid = numpy.zeros((size, size), dtype=numpy.uint8)
        self.cells = [
            [XORCell(self, r, c) for c in range(size)]
            for r in range(size)
        ]

        for c in range(size):
            value = self.random.randint(0, 1)
            self.grid[0, c] = value
            self.cells[0][c].state = value

        self.step_count = 0

    def step(self):
        r = self.step_count + 1
        if r >= self.size:
            self.running = False
            return

        row = self.cells[r]
        for cell in row:
            cell.compute(wrap=False)
        for cell in row:
            cell.advance()

        self.step_count += 1
        if self.step_count >= self.size - 1:
            self.running = False


class FullAutomaton(mesa.Model):
    def __init__(self, size=50, seed=None):
        super().__init__(rng=seed)
        self.size = size
        self.grid = numpy.zeros((size, size), dtype=numpy.uint8)
        self.cells = [
            [XORCell(self, r, c) for c in range(size)]
            for r in range(size)
        ]

        for r in range(size):
            for c in range(size):
                value = self.random.randint(0, 1)
                self.grid[r, c] = value
                self.cells[r][c].state = value

        self.step_count = 0

    def step(self):
        self.agents.do("compute", wrap=True)
        self.agents.do("advance")
        self.step_count += 1


def draw_frame(grid, title, size):
    fig, ax = pyplot.subplots(figsize=(6, 6))
    ax.imshow(grid, cmap="binary", interpolation="nearest", vmin=0, vmax=1)
    ax.set_title(title)
    ax.set_xlabel("Column")
    ax.set_ylabel("Row")
    ax.set_xticks(numpy.arange(0, size, 5))
    ax.set_yticks(numpy.arange(0, size, 5))
    ax.grid(False)
    fig.tight_layout()

    fig.canvas.draw()
    frame = numpy.asarray(fig.canvas.buffer_rgba())[:, :, :3].copy()
    pyplot.close(fig)
    return frame


def Automata2GIFF(Options):

    GridSize = Options.GridSize
    Seed = getattr(Options, "Seed", None)
    frames = []

    model = XORAutomaton(size=GridSize, seed=Seed)
    for _ in range(GridSize):
        frames.append(draw_frame(model.grid, f"Simulation 1 — Step {model.step_count}", GridSize))
        if model.running:
            model.step()

    model = FullAutomaton(size=GridSize, seed=Seed)
    for _ in range(GridSize):
        frames.append(draw_frame(model.grid, f"Simulation 2 — Step {model.step_count}", GridSize))
        model.step()

    imageio.mimsave(Options.File, frames, duration=1 / Options.FPS, loop=0)
    print(f"GIF saved as: {Options.File}")
