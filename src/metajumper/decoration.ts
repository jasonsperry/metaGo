import * as vscode from 'vscode';
import { DecorationModel } from './decoration-model';
import { Config } from '../config';

type Decorations = [vscode.TextEditorDecorationType, vscode.DecorationOptions[]][];

export class Decorator {
	private config: Config;
	private renderOptionsCache: { [index: string]: vscode.ThemableDecorationAttachmentRenderOptions };
	private decorationTypeCache: { [chars: number]: vscode.TextEditorDecorationType } = {};
	public commandIndicatorDecorationType;

	initialize = (config: Config) => {
		this.config = config;
		this.updateCache();
		this.commandIndicatorDecorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: 'rgba(255,255,0,0.4)',
			borderWidth: '2px',
			borderStyle: 'solid',
			light: {
				borderColor: 'rgba(255,255,0,0.8)'
			},
			dark: {
				borderColor: 'rgba(255,255,0,0.4)'
			}
		});
	}

	addCommandIndicator = (editor: vscode.TextEditor) => {
		let line = editor.selection.anchor.line;
		let char = editor.selection.anchor.character;
		let option = [new vscode.Range(line, char, line, char)];
		editor.setDecorations(this.commandIndicatorDecorationType, option);
	}

	removeCommandIndicator = (editor: vscode.TextEditor) => {
		let locations: vscode.Range[] = [];
		vscode.window.activeTextEditor.setDecorations(this.commandIndicatorDecorationType, locations);
	}

	create = (editor: vscode.TextEditor, decorationModel: DecorationModel[]): Decorations => {
		let decorations: Decorations = [];
		decorationModel.forEach((model) => {
			let code = model.code;
			let len = code.length;

			if (!decorations[len]) {
				let decorationType = this.createTextEditorDecorationType(len);
				decorations[len] = [decorationType, []];
			}
			let option = this.createDecorationOptions(null, model.lineIndex, model.charIndex + 1, model.charIndex + len, code);
			decorations[len][1].push(option);
		})

		decorations.forEach(([type, option]) => editor.setDecorations(type, option));
		return decorations;
	}

	hide = (editor: vscode.TextEditor, decorations: Decorations) => {
		for (var dec of decorations) {
			editor.setDecorations(dec[0], []);
		}
	}

	show = (editor: vscode.TextEditor, decorations: Decorations) => {
		for (var dec of decorations) {
			editor.setDecorations(dec[0], dec[1]);
		}
	}

	remove = (editor: vscode.TextEditor) => {
		for (var codeLen in this.decorationTypeCache) {
			if (this.decorationTypeCache[codeLen] === null) continue;
			editor.setDecorations(this.decorationTypeCache[codeLen], []);
			this.decorationTypeCache[codeLen].dispose();
			this.decorationTypeCache[codeLen] = null;
		}
	}

	private createTextEditorDecorationType = (chars: number) => {
		let decorationType = this.decorationTypeCache[chars];
		if (decorationType) return decorationType;
		decorationType = vscode.window.createTextEditorDecorationType({
			after: {
				margin: `0 0 0 ${chars * (-this.config.decoration.width)}px`,
				height: `${this.config.decoration.height}px`,
				width: `${chars * this.config.decoration.width}px`
			}
		});
		this.decorationTypeCache[chars] = decorationType;
		return decorationType;
	}

	private createDecorationOptions = (context: vscode.ExtensionContext, line: number, startCharacter: number, endCharacter: number, code: string): vscode.DecorationOptions => {
		const renderOptions = this.getAfterRenderOptions(code);
		return {
			range: new vscode.Range(line, startCharacter, line, endCharacter),
			renderOptions: {
				dark: {
					after: renderOptions,
				},
				light: {
					after: renderOptions,
				},
			}
		};
	}

	private getAfterRenderOptions = (code: string) => {
		if (this.renderOptionsCache[code] !== undefined)
			return this.renderOptionsCache[code];
		this.renderOptionsCache[code] = this.buildAfterRenderOptions(code);
		return this.renderOptionsCache[code];
	}

	private updateCache = () => {
		this.renderOptionsCache = {};
		this.config.jumper.characters
			.forEach(code => this.renderOptionsCache[code] = this.buildAfterRenderOptions(code))
	}

	private buildAfterRenderOptions = (code: string) => {
		return this.config.decoration.useTextBasedDecorations
			? this.buildAfterRenderOptionsText(code)
			: this.buildAfterRenderOptionsSvg(code)
			;
	}

	private buildAfterRenderOptionsText = (code: string) => {
		let cf = this.config.decoration;
		let key = cf.upperCase ? code.toUpperCase() : code.toLowerCase();

		const knownColors = {
			chartreuse: `rgba(127,255,0,${cf.bgOpacity})`,
			yellow: `rgba(255,255,0,${cf.bgOpacity})`,
		};

		let colors = cf.bgColor.split(',');
		let bgColor = colors[(code.length - 1) % colors.length];
		bgColor = knownColors[bgColor] || bgColor;
		let width = code.length * cf.width;
		return {
			contentText: key,
			backgroundColor: bgColor,
			fontWeight: cf.fontWeight,
			color: cf.color,
			width: `${width}px`,
			height: `${cf.height}px`,
			// border:`${cf.borderColor}`
		};
	}

	private buildAfterRenderOptionsSvg = (code: string) => {
		let cf = this.config.decoration;
		let key = this.config.decoration.upperCase ? code.toUpperCase() : code.toLowerCase();
		let width = code.length * cf.width;
		let colors = cf.bgColor.split(',');
		let bgColor = colors[(code.length - 1) % colors.length];
		let svg =
			`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${cf.height}" height="${cf.height}" width="${width}"><rect width="${width}" height="${cf.height}" rx="2" ry="3" style="fill: ${bgColor};fill-opacity:${cf.bgOpacity};stroke:${cf.borderColor};stroke-opacity:${cf.bgOpacity};"/><text font-family="${cf.fontFamily}" font-weight="${cf.fontWeight}" font-size="${cf.fontSize}px" style="fill:${cf.color}" x="${cf.x}" y="${cf.y}">${key}</text></svg>`;
		return {
			contentIconPath: vscode.Uri.parse(svg)
		};
	}

}
