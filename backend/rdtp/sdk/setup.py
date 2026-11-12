from setuptools import setup, find_packages

setup(
    name="rdtp",
    version="1.0.0",
    packages=find_packages(),
    description="Real-Time Distributed Training Protocol for Edge-to-Cloud Machine Learning",
    author="Mahammad Azhar",
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "rdtp=rdtp.cli:main",
        ],
    },
)

